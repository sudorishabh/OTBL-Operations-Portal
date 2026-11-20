import { format } from "date-fns";
import { capitalFirstLetter, constants } from "@pkg/utils";
import type { RouterOutputs } from "@/lib/trpc";
import { ALL, type FilterOption } from "@/components/filters/list-filters";

// A site's expenses for the monthly view, filtered and totalled here as the
// filters change, so no filter waits on the server.
export type MonthlyExpense =
  RouterOutputs["expenseQuery"]["getVendorMonthlyExpenses"][number];

// Picks the expenses with no vendor, order or activity.
export const NONE = "none";

export type MonthlyExpenseFilters = {
  search: string;
  /** ALL, NONE or a vendor's id. */
  vendor: string;
  /** ALL or a month, as "2026-04", the first and last to include. */
  from: string;
  to: string;
  /** ALL, NONE, "job:<id>" for a job order or "order:<id>" for a contract order. */
  order: string;
  /** ALL, NONE or an activity's key. */
  activity: string;
  /** ALL, "order" for those recorded by a purchase order, or "site". */
  recorded: string;
  /** ALL or "exceeded", for those over the estimate. */
  exceeded: string;
};

export const NO_FILTERS: MonthlyExpenseFilters = {
  search: "",
  vendor: ALL,
  from: ALL,
  to: ALL,
  order: ALL,
  activity: ALL,
  recorded: ALL,
  exceeded: ALL,
};

export const isFiltered = (filters: MonthlyExpenseFilters) =>
  filters.search.trim() !== "" ||
  Object.entries(filters).some(
    ([key, value]) => key !== "search" && value !== ALL,
  );

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export const monthLabel = (month: string) =>
  format(new Date(`${month}-01T00:00:00`), "MMM yyyy");

const vendorKey = (expense: MonthlyExpense) =>
  expense.vendor_id ? String(expense.vendor_id) : NONE;

export const vendorName = (expense: MonthlyExpense) =>
  expense.vendor_name ? capitalFirstLetter(expense.vendor_name) : "No vendor";

const orderKey = (expense: MonthlyExpense) =>
  expense.job_order_id
    ? `job:${expense.job_order_id}`
    : expense.order_id
      ? `order:${expense.order_id}`
      : NONE;

// What the expense is spent on: a job order, a purchase order or
// sub-contract, or nothing in particular.
export const orderLabel = (expense: MonthlyExpense) =>
  expense.jo_number
    ? `Job order ${expense.jo_number}`
    : (expense.order_code ?? "Miscellaneous");

export const activityLabel = (key: string) =>
  key === constants.OIL_ZAPPER.KEY
    ? constants.OIL_ZAPPER.LABEL
    : key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

export const filterExpenses = (
  expenses: MonthlyExpense[],
  filters: MonthlyExpenseFilters,
) => {
  const term = filters.search.trim().toLowerCase();
  return expenses.filter(
    (expense) =>
      (filters.vendor === ALL || vendorKey(expense) === filters.vendor) &&
      (filters.from === ALL || expense.month >= filters.from) &&
      (filters.to === ALL || expense.month <= filters.to) &&
      (filters.order === ALL || orderKey(expense) === filters.order) &&
      (filters.activity === ALL ||
        (expense.activity_key ?? NONE) === filters.activity) &&
      (filters.recorded === ALL ||
        (filters.recorded === "order") === expense.from_order) &&
      (filters.exceeded === ALL || expense.is_exceeded) &&
      (!term ||
        [
          expense.description,
          expense.invoice_number,
          expense.vendor_name,
          expense.jo_number,
          expense.order_code,
        ].some((text) => text?.toLowerCase().includes(term))),
  );
};

// Each distinct value once, by label; the expenses with none are left to
// a pinned choice of their own.
const distinct = (
  expenses: MonthlyExpense[],
  keyOf: (expense: MonthlyExpense) => string,
  labelOf: (expense: MonthlyExpense) => string,
): FilterOption[] => {
  const options = new Map<string, string>();
  for (const expense of expenses) {
    const key = keyOf(expense);
    if (key !== NONE && !options.has(key)) options.set(key, labelOf(expense));
  }
  return [...options]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    );
};

// What each filter can pick, from every expense at the site, so a choice
// doesn't vanish once another filter hides its expenses.
export const filterChoices = (expenses: MonthlyExpense[]) => ({
  vendors: distinct(expenses, vendorKey, vendorName),
  hasNoVendor: expenses.some((expense) => !expense.vendor_id),
  // Oldest first, as a range is read.
  months: [...new Set(expenses.map((expense) => expense.month))].sort(),
  orders: distinct(expenses, orderKey, orderLabel),
  hasNoOrder: expenses.some((expense) => orderKey(expense) === NONE),
  activities: distinct(
    expenses,
    (expense) => expense.activity_key ?? NONE,
    (expense) => activityLabel(expense.activity_key ?? ""),
  ),
  hasNoActivity: expenses.some((expense) => !expense.activity_key),
  // Only worth filtering by when the site has both kinds.
  hasBothRecorded:
    expenses.some((expense) => expense.from_order) &&
    expenses.some((expense) => !expense.from_order),
  hasExceeded: expenses.some((expense) => expense.is_exceeded),
});

export type VendorColumn = { key: string; name: string; total: number };

export type MonthRow = {
  month: string;
  total: number;
  byVendor: Record<string, number>;
  expenses: MonthlyExpense[];
};

// Kept to the paisa, so sums don't drift.
const add = (a: number, b: number) => Math.round((a + b) * 100) / 100;

// The expenses as a table: a row per month, newest first, and a column per
// vendor, the biggest spend first and those with no vendor last.
export const byMonthAndVendor = (expenses: MonthlyExpense[]) => {
  const vendors = new Map<string, VendorColumn>();
  const months = new Map<string, MonthRow>();
  let total = 0;

  for (const expense of expenses) {
    const key = vendorKey(expense);
    const vendor = vendors.get(key) ?? {
      key,
      name: vendorName(expense),
      total: 0,
    };
    vendor.total = add(vendor.total, expense.amount);
    vendors.set(key, vendor);

    const row = months.get(expense.month) ?? {
      month: expense.month,
      total: 0,
      byVendor: {},
      expenses: [],
    };
    row.total = add(row.total, expense.amount);
    row.byVendor[key] = add(row.byVendor[key] ?? 0, expense.amount);
    row.expenses.push(expense);
    months.set(expense.month, row);

    total = add(total, expense.amount);
  }

  return {
    vendors: [...vendors.values()].sort(
      (a, b) =>
        Number(a.key === NONE) - Number(b.key === NONE) || b.total - a.total,
    ),
    months: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)),
    total,
  };
};

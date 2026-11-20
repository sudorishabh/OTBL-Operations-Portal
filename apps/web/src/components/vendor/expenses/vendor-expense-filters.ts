import { format } from "date-fns";
import { constants } from "@pkg/utils";
import type { RouterOutputs } from "@/lib/trpc";
import { ALL, type FilterOption } from "@/components/filters/list-filters";

// The filters a vendor's expenses are narrowed by, and how they are named,
// coloured and sent to the server.

export type VendorExpense =
  RouterOutputs["contractorQuery"]["getContractorExpenses"]["expenses"][number];
export type VendorExpenseBreakdown =
  RouterOutputs["contractorQuery"]["getContractorExpenseBreakdown"];
export type ExpenseSource = VendorExpense["source"];

// What an expense was spent on, in the breakdown's fixed order. The colours
// are a colour-blind-safe set, in the order it was checked in.
export const SOURCES: {
  value: ExpenseSource;
  label: string;
  color: string;
}[] = [
  { value: "purchase_order", label: "Purchase orders", color: "#2a78d6" },
  { value: "sub_contract", label: "Sub-contracts", color: "#eb6834" },
  { value: "job_order", label: "Job orders", color: "#1baf7a" },
  { value: "none", label: "Not on an order", color: "#eda100" },
];

export const sourceOf = (value: string) =>
  SOURCES.find((source) => source.value === value) ?? SOURCES[3]!;

// The one hue of the month and work order bars, and its faded step for the
// months outside a picked range.
export const SPEND_COLOR = "#2a78d6";
export const SPEND_FADED_COLOR = "#b7d3f6";

export type VendorExpenseFilters = {
  search: string;
  /** ALL or a month, as "2026-04", the first and last to include. */
  from: string;
  to: string;
  /** ALL or a work order's id. */
  workOrder: string;
  /** ALL or a process. */
  process: string;
  /** ALL or an ExpenseSource. */
  source: string;
  /** Only those over the estimate. */
  exceeded: boolean;
};

export const NO_FILTERS: VendorExpenseFilters = {
  search: "",
  from: ALL,
  to: ALL,
  workOrder: ALL,
  process: ALL,
  source: ALL,
  exceeded: false,
};

export const isFiltered = (filters: VendorExpenseFilters) =>
  filters.search.trim() !== "" ||
  filters.exceeded ||
  [
    filters.from,
    filters.to,
    filters.workOrder,
    filters.process,
    filters.source,
  ].some((value) => value !== ALL);

const picked = (value: string) => (value === ALL ? undefined : value);

// The filters as the server takes them, with the search as typed so far.
export const toInput = (
  id: number,
  filters: VendorExpenseFilters,
  search: string,
) => ({
  id,
  search: search.trim() || undefined,
  from_month: picked(filters.from),
  to_month: picked(filters.to),
  work_order_id:
    filters.workOrder === ALL ? undefined : Number(filters.workOrder),
  process: picked(filters.process) as
    | typeof constants.WO_PROCESS.RESTORATION
    | typeof constants.WO_PROCESS.BIOREMEDIATION
    | undefined,
  source: picked(filters.source) as ExpenseSource | undefined,
  exceeded_only: filters.exceeded || undefined,
});

export const SORT_OPTIONS: FilterOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc", label: "Lowest amount" },
];
export type VendorExpenseSort =
  | "newest"
  | "oldest"
  | "amount_desc"
  | "amount_asc";

export const monthLabel = (month: string, pattern = "MMM yyyy") =>
  format(new Date(`${month}-01T00:00:00`), pattern);

// Every month from the first to the last, as "2026-04", oldest first.
export const monthsBetween = (first: string, last: string) => {
  const months: string[] = [];
  const date = new Date(`${first}-01T00:00:00`);
  const end = new Date(`${last}-01T00:00:00`);
  while (date <= end) {
    months.push(format(date, "yyyy-MM"));
    date.setMonth(date.getMonth() + 1);
  }
  return months;
};

// Whether a month is inside the range the filters pick.
export const inPickedMonths = (
  month: string,
  filters: Pick<VendorExpenseFilters, "from" | "to">,
) =>
  (filters.from === ALL || month >= filters.from) &&
  (filters.to === ALL || month <= filters.to);

// To the paisa, as an expense was recorded.
export const formatExactAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

// ₹4.2L, ₹38K: for axis ticks.
export const formatCompactAmount = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

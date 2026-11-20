import { ALL } from "@/components/filters/list-filters";

// How a site's expense list is narrowed and ordered. The server applies both,
// so they hold across every page of expenses and their totals.

// Picks the expenses with no vendor, or on no activity.
export const NONE = "none";

export type ExpenseSort = "newest" | "oldest" | "amount_desc" | "amount_asc";

export const EXPENSE_SORT_OPTIONS: { value: ExpenseSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount first" },
  { value: "amount_asc", label: "Lowest amount first" },
];

export type ExpenseListFilters = {
  search: string;
  /** ALL, NONE or a vendor's id. */
  vendor: string;
  /** YYYY-MM-DD, the first and last day an expense may start on. */
  from?: string;
  to?: string;
  /** ALL, NONE or an activity's key. */
  activity: string;
  /** ALL or "exceeded", for those over the estimate. */
  exceeded: string;
};

export const NO_EXPENSE_FILTERS: ExpenseListFilters = {
  search: "",
  vendor: ALL,
  activity: ALL,
  exceeded: ALL,
};

// The filters as the API takes them, leaving out those not set. The search
// is passed apart, as it is debounced.
export const toApiFilters = (filters: ExpenseListFilters, search: string) => ({
  search: search.trim() || undefined,
  vendor:
    filters.vendor === ALL
      ? undefined
      : filters.vendor === NONE
        ? ("none" as const)
        : Number(filters.vendor),
  // Either end may be open: a start date alone is that day on.
  from: filters.from,
  to: filters.to,
  activity: filters.activity === ALL ? undefined : filters.activity,
  exceeded_only: filters.exceeded === ALL ? undefined : true,
});

export type ApiExpenseFilters = ReturnType<typeof toApiFilters>;

export const hasApiFilters = (filters: ApiExpenseFilters) =>
  Object.values(filters).some((value) => value !== undefined);

// Groups, such as job orders or purchase orders, in the chosen order: by
// their date, newest or oldest first, or by what they have cost.
export const orderGroups = <T>(
  groups: T[],
  sort: ExpenseSort,
  dateOf: (group: T) => string | Date | null | undefined,
  totalOf: (group: T) => number,
) => {
  const time = (group: T) => {
    const date = dateOf(group);
    return date ? new Date(date).getTime() : 0;
  };
  return [...groups].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return time(a) - time(b);
      case "amount_desc":
        return totalOf(b) - totalOf(a) || time(b) - time(a);
      case "amount_asc":
        return totalOf(a) - totalOf(b) || time(b) - time(a);
      default:
        return time(b) - time(a);
    }
  });
};

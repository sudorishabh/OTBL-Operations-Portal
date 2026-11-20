import { ALL } from "@/components/filters/list-filters";
import { type ContractOrder } from "./contract-order-display";

// How a work order's purchase orders and sub-contracts are narrowed and
// ordered. The server applies the filters, a page at a time.

// Which orders the list shows: all of them, or one type.
export type OrderType = typeof ALL | ContractOrder["type"];

export type OrderSort = "newest" | "oldest";

export const ORDER_SORT_OPTIONS: { value: OrderSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

export type OrderFilters = {
  type: OrderType;
  search: string;
  /** ALL or a work order site's id. */
  site: string;
  /** ALL or a vendor's id. */
  vendor: string;
  /** ALL, or whether its completion documents are in. */
  completion: typeof ALL | "completed" | "pending";
  /** YYYY-MM-DD, the first and last day an order may be dated. */
  from?: string;
  to?: string;
};

export const NO_ORDER_FILTERS: OrderFilters = {
  type: ALL,
  search: "",
  site: ALL,
  vendor: ALL,
  completion: ALL,
};

// Whether any filter but the type tabs is set.
export const hasOrderFilters = (filters: OrderFilters) =>
  !!filters.search.trim() ||
  filters.site !== ALL ||
  filters.vendor !== ALL ||
  filters.completion !== ALL ||
  !!filters.from;

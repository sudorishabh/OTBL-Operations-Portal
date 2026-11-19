import { format } from "date-fns";
import { ALL, type FilterOption } from "@/components/filters/list-filters";
import { toDocuments } from "@/lib/documents";
import { itemLabel, type ContractOrder } from "./contract-orders-section";

// How a work order's purchase orders and sub-contracts are narrowed and
// ordered. Every order is loaded at once, so this runs in the browser.

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

export const isCompleted = (order: ContractOrder) =>
  toDocuments(order.completion_documents).length > 0;

const dayOf = (date: string | Date) => format(new Date(date), "yyyy-MM-dd");

// Everything a search looks through: its code and references, vendors,
// sites and what it requires at them.
const searchText = (order: ContractOrder) =>
  [
    order.code,
    order.order_number,
    order.invoice_number,
    order.description,
    ...order.vendors.flatMap((vendor) => [vendor.name, vendor.code]),
    ...order.items.flatMap((item) => [
      item.site_name,
      item.site_code,
      itemLabel(item.item, item.description),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

// Whether an order passes every filter, leaving out its type when asked,
// so the type tabs can count what the other filters leave.
const matches = (
  order: ContractOrder,
  filters: OrderFilters,
  { ignoreType = false } = {},
) => {
  if (!ignoreType && filters.type !== ALL && order.type !== filters.type) {
    return false;
  }
  const search = filters.search.trim().toLowerCase();
  if (search && !searchText(order).includes(search)) return false;
  if (
    filters.site !== ALL &&
    !order.items.some(
      (item) => String(item.work_order_site_id) === filters.site,
    )
  ) {
    return false;
  }
  if (
    filters.vendor !== ALL &&
    !order.vendors.some((vendor) => String(vendor.id) === filters.vendor)
  ) {
    return false;
  }
  if (
    filters.completion !== ALL &&
    isCompleted(order) !== (filters.completion === "completed")
  ) {
    return false;
  }
  if (filters.from) {
    // One day picked is that day alone, as the date filter shows it.
    const day = dayOf(order.order_date);
    if (day < filters.from || day > (filters.to ?? filters.from)) return false;
  }
  return true;
};

// The orders the filters leave, in the chosen order.
export const filterOrders = (
  orders: ContractOrder[],
  filters: OrderFilters,
  sort: OrderSort,
) => {
  const time = (order: ContractOrder) => new Date(order.order_date).getTime();
  return orders
    .filter((order) => matches(order, filters))
    .sort((a, b) =>
      sort === "oldest"
        ? time(a) - time(b) || a.id - b.id
        : time(b) - time(a) || b.id - a.id,
    );
};

// How many orders of each type the other filters leave.
export const countByType = (orders: ContractOrder[], filters: OrderFilters) => {
  const left = orders.filter((order) =>
    matches(order, filters, { ignoreType: true }),
  );
  return {
    [ALL]: left.length,
    purchase_order: left.filter((order) => order.type === "purchase_order")
      .length,
    sub_contract: left.filter((order) => order.type === "sub_contract").length,
  } satisfies Record<OrderType, number>;
};

const byLabel = (a: FilterOption, b: FilterOption) =>
  a.label.localeCompare(b.label);

// The sites and vendors the orders name, to filter by.
export const filterChoices = (orders: ContractOrder[]) => {
  const sites = new Map<string, FilterOption>();
  const vendors = new Map<string, FilterOption>();
  for (const order of orders) {
    for (const item of order.items) {
      sites.set(String(item.work_order_site_id), {
        value: String(item.work_order_site_id),
        label: item.site_name ?? "Site",
        hint: item.site_code ?? undefined,
      });
    }
    for (const vendor of order.vendors) {
      vendors.set(String(vendor.id), {
        value: String(vendor.id),
        label: vendor.name,
        hint: vendor.code,
      });
    }
  }
  return {
    sites: [...sites.values()].sort(byLabel),
    vendors: [...vendors.values()].sort(byLabel),
  };
};

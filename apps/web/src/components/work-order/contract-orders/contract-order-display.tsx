import React from "react";
import { ShoppingCart, Wrench } from "lucide-react";
import { constants } from "@pkg/utils";

// How purchase orders and sub-contracts are labelled, costed and grouped,
// wherever they are shown.

const { CONTRACT_ORDER_TYPE, CONTRACT_ORDER_ITEMS } = constants;

export interface ContractOrder {
  id: number;
  type: "purchase_order" | "sub_contract";
  // Its code, and the number typed for an order added before codes were.
  code: string;
  order_number: string | null;
  order_date: string | Date;
  description: string | null;
  // A purchase order's cost; none on a sub-contract.
  unit_rate: string | null;
  gst_percentage: string | null;
  invoice_number: string | null;
  // A sub-contract whose requirements each take one expense at the site.
  single_expense: boolean;
  documents: unknown;
  completion_documents: unknown;
  items: {
    id: number;
    work_order_site_id: number;
    site_code?: string | null;
    site_name: string | null;
    item: string;
    description: string | null;
    // A purchase order's oil zapper for the site.
    quantity: string | null;
    unit: string;
    // A sub-contract requirement's rate per unit.
    unit_rate: string | null;
  }[];
  vendors: { id: number; code?: string; name: string }[];
}

export type OrderItem = ContractOrder["items"][number];

export const itemLabel = (item: string, description?: string | null) =>
  item === "other" && description
    ? description
    : (CONTRACT_ORDER_ITEMS.find((option) => option.key === item)?.label ??
      item);

export const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export const formatQuantity = (quantity: number) =>
  quantity.toLocaleString("en-IN", { maximumFractionDigits: 2 });

// One of an item's unit, as a rate is given per: hour, man-day, trip.
export const singleUnit = (unit: string) =>
  unit === "Nos" ? "unit" : unit.replace(/s$/, "");

// A sub-contract requirement's rate, such as ₹1,200/hour.
export const rateLabel = (rate: number | string, unit: string) =>
  `${formatAmount(Number(rate))}/${singleUnit(unit)}`;

// What a purchase order costs in all: its oil zapper at its rate, with GST.
// Null for a sub-contract, costed at its site.
export const purchaseOrderCost = (
  order: Pick<ContractOrder, "type" | "unit_rate" | "gst_percentage"> & {
    items: Pick<OrderItem, "quantity">[];
  },
) => {
  if (order.type !== CONTRACT_ORDER_TYPE.PURCHASE_ORDER || !order.unit_rate) {
    return null;
  }
  const quantity = order.items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );
  const rate = Number(order.unit_rate);
  const gst = Number(order.gst_percentage ?? 0);
  return { total: quantity * rate * (1 + gst / 100), quantity, rate, gst };
};

// An order's requirements, a group per site, in the order they're listed.
export const requirementsBySite = <T extends OrderItem>(items: T[]) => {
  const sites = new Map<number, { name: string; items: T[] }>();
  for (const item of items) {
    const site = sites.get(item.work_order_site_id) ?? {
      name: item.site_name ?? "Site",
      items: [],
    };
    site.items.push(item);
    sites.set(item.work_order_site_id, site);
  }
  return [...sites.entries()];
};

// What an order asks of a requirement: a purchase order's oil zapper, or a
// sub-contract's rate, which requirements added before rates may lack.
export const requirementTerms = (
  order: Pick<ContractOrder, "type">,
  item: OrderItem,
) => {
  if (order.type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER) {
    return `${Number(item.quantity ?? 0).toLocaleString("en-IN")} ${item.unit}`;
  }
  return item.unit_rate ? (
    rateLabel(item.unit_rate, item.unit)
  ) : (
    <span className='text-amber-700'>No rate</span>
  );
};

// How each kind of order is marked.
export const ORDER_TYPES = [
  {
    type: CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
    label: "Purchase order",
    filterLabel: "Purchase orders",
    Icon: ShoppingCart,
    tone: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  {
    type: CONTRACT_ORDER_TYPE.SUB_CONTRACT,
    label: "Sub-contract",
    filterLabel: "Sub-contracts",
    Icon: Wrench,
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
] as const;

export const orderTypeOf = (type: string) =>
  ORDER_TYPES.find((option) => option.type === type) ?? ORDER_TYPES[0];

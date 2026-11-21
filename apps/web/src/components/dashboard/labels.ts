import { constants } from "@pkg/utils";

// What the overview calls things, shared by its cards and dialogs.

const { WO_PROCESS } = constants;

// A work order's process, in the order the work order form lists them.
export const WORK_ORDER_PROCESSES = [
  { value: WO_PROCESS.BIOREMEDIATION, label: "Bioremediation" },
  { value: WO_PROCESS.RESTORATION, label: "Restoration" },
  {
    value: WO_PROCESS.BIOREMEDIATION_RESTORATION,
    label: "Bioremediation & restoration",
  },
] as const;

// The process of a site, where an expense is spent.
export const SITE_PROCESSES = [
  { value: WO_PROCESS.BIOREMEDIATION, label: "Bioremediation" },
  { value: WO_PROCESS.RESTORATION, label: "Restoration" },
] as const;

export const processLabel = (process: string) =>
  WORK_ORDER_PROCESSES.find((option) => option.value === process)?.label ??
  process;

// What an expense was spent through, as the vendor page names it.
export const EXPENSE_SOURCES = [
  { value: "job_order", label: "Restoration job orders" },
  { value: "sub_contract", label: "Sub-contracts" },
  { value: "purchase_order", label: "Purchase orders" },
  { value: "none", label: "Not under an order" },
] as const;

export type ExpenseSource = (typeof EXPENSE_SOURCES)[number]["value"];

export const sourceLabel = (source: string) =>
  EXPENSE_SOURCES.find((option) => option.value === source)?.label ?? source;

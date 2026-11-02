import { capitalFirstLetter } from "@pkg/utils";
import type { JobOrder } from "./job-order-dialog";
import type { Restoration } from "./restoration-section";

const STATUS_STYLES = {
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inProgress: "bg-purple-50 text-purple-700 ring-purple-200",
  notStarted: "bg-gray-50 text-gray-600 ring-gray-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
} as const;

// Where the restoration stands. It completes on its own once expenses use up
// the schedule of rates, and has started once anything is spent on it.
export const restorationStatus = (
  restoration: Pick<Restoration, "status" | "is_completed">,
  spent: number,
) => {
  if (restoration.status === "cancelled")
    return { label: "Cancelled", style: STATUS_STYLES.cancelled };
  if (restoration.is_completed)
    return { label: "Complete", style: STATUS_STYLES.complete };
  if (spent > 0) return { label: "In progress", style: STATUS_STYLES.inProgress };
  return { label: "Not started", style: STATUS_STYLES.notStarted };
};

// Every vendor the job orders give work to, once each.
export const jobOrderVendorNames = (jobOrders: JobOrder[]) =>
  [
    ...new Map(
      jobOrders.flatMap((jobOrder) =>
        jobOrder.vendors.map((vendor) => [vendor.id, vendor.name] as const),
      ),
    ).values(),
  ].map((name) => capitalFirstLetter(name));

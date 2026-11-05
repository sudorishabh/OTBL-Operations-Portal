import {
  capitalFirstLetter,
  certifiedQuantityByRow,
  constants,
  countsTowardSor,
  type JobOrderActivityKey,
} from "@pkg/utils";
import type { JobOrder } from "./job-order-dialog";
import type { JobOrderActivityRow } from "./job-order-activities-table";
import type { RestorationRate } from "./restoration-rates-table";
import type { Restoration } from "./restoration-section";

const { JOB_ORDER_ACTIVITIES } = constants;

// Allowance for decimal rounding when comparing quantities.
export const QTY_EPSILON = 0.001;

export const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, (part / whole) * 100) : 0;

// How far one activity's schedule of rates quantity has been used.
export const activityTone = (used: number, estimated: number) => {
  if (used > estimated + QTY_EPSILON)
    return { bar: "bg-rose-500", text: "text-rose-600" };
  if (used + QTY_EPSILON >= estimated)
    return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (used > 0) return { bar: "bg-purple-500", text: "text-gray-600" };
  return { bar: "bg-gray-200", text: "text-gray-400" };
};

const STATUS_STYLES = {
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inProgress: "bg-purple-50 text-purple-700 ring-purple-200",
  notStarted: "bg-gray-50 text-gray-600 ring-gray-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
} as const;

// Where the restoration stands. It completes on its own once completion
// certificates use up the schedule of rates, and has started once anything
// is spent on it.
export const restorationStatus = (
  restoration: Pick<Restoration, "status" | "is_completed">,
  spent: number,
) => {
  if (restoration.status === "cancelled")
    return { label: "Cancelled", style: STATUS_STYLES.cancelled };
  if (restoration.is_completed)
    return { label: "Complete", style: STATUS_STYLES.complete };
  if (spent > 0)
    return { label: "In progress", style: STATUS_STYLES.inProgress };
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

// The schedule of rates activities a job order gives out: those of its form's
// rows not answered "No". Null for a job order whose form names no activities,
// such as one saved before the form, so its expenses can be under any.
export const jobOrderSorActivities = (
  jobOrder: Pick<JobOrder, "activities">,
): Set<string> | null => {
  const rows = jobOrder.activities ?? [];
  if (rows.length === 0) return null;
  return new Set(
    rows
      .filter((row) => !/^no\.?$/i.test(row.quantity.trim()))
      .flatMap((row) => {
        const activity = JOB_ORDER_ACTIVITIES.find((a) => a.key === row.key);
        return activity ? [activity.sorActivity] : [];
      }),
  );
};

// What the completion certificates have left of the schedule of rates against
// each job order row that uses it up: its activity's quantity, or for
// transportation, its distance slab's. A certificate being filled in counts as
// it reads now, in place of the one saved.
export const sorLeftByRow = (
  rates: RestorationRate[],
  jobOrders: JobOrder[],
  draft?: { jobOrderId: number; rows: JobOrderActivityRow[] },
) => {
  const certificates = draft
    ? [
        ...jobOrders.filter((jobOrder) => jobOrder.id !== draft.jobOrderId),
        { completion_activities: draft.rows },
      ]
    : jobOrders;
  const certified = certifiedQuantityByRow(certificates);

  const left: Partial<Record<JobOrderActivityKey, number>> = {};
  for (const activity of JOB_ORDER_ACTIVITIES) {
    if (!countsTowardSor(activity.key)) continue;
    const rate = rates.find((r) => r.activity === activity.sorActivity);
    if (!rate) continue;
    // Older transportation rates have no slabs to measure a row against.
    const quantity =
      "sorSlab" in activity
        ? rate.transportation_slabs?.[activity.sorSlab]?.quantity
        : Number(rate.estimated_quantity) || 0;
    if (quantity == null) continue;
    left[activity.key] = quantity - (certified[activity.key] ?? 0);
  }
  return left;
};

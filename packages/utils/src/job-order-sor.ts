import { JOB_ORDER_ACTIVITIES, allActivityOptions } from "./constants";

export type JobOrderActivityKey = (typeof JOB_ORDER_ACTIVITIES)[number]["key"];

// A row of a job order form or work completion certificate, as it is saved.
interface ActivityRow {
  key: string;
  quantity: string;
}

interface CertifiedJobOrder {
  completion_activities?: ActivityRow[] | null;
}

const BIOREMEDIATION_ACTIVITIES = new Set<string>(
  allActivityOptions
    .filter((option) => option.isBioremediation)
    .map((option) => option.value),
);

// The certificate rows that use up the schedule of rates: those measured in a
// unit, outside bioremediation, as its sites use up their own soil.
const SOR_ROWS = new Map<string, (typeof JOB_ORDER_ACTIVITIES)[number]>(
  JOB_ORDER_ACTIVITIES.filter(
    (activity) =>
      activity.completionUnit &&
      !BIOREMEDIATION_ACTIVITIES.has(activity.sorActivity),
  ).map((activity) => [activity.key, activity]),
);

export const countsTowardSor = (key: string) => SOR_ROWS.has(key);

// The number a quantity written on a form stands for: a plain number, maybe
// with its unit, or the result of a working such as "25 × 20 = 500". Anything
// else, such as "No" or "To be assessed later", stands for none.
export function jobOrderQuantity(
  text: string | null | undefined,
): number | null {
  const result = (text ?? "").split("=").pop()!.replace(/,/g, "").trim();
  const match = /^(\d+(?:\.\d+)?)[a-z²³.\s]*$/i.exec(result);
  return match ? Number(match[1]) : null;
}

// What the job orders' completion certificates have certified, against each
// of the rows that use up the schedule of rates.
export function certifiedQuantityByRow(
  jobOrders: CertifiedJobOrder[],
): Partial<Record<JobOrderActivityKey, number>> {
  const totals: Partial<Record<JobOrderActivityKey, number>> = {};
  for (const jobOrder of jobOrders) {
    for (const row of jobOrder.completion_activities ?? []) {
      const activity = SOR_ROWS.get(row.key);
      const quantity = jobOrderQuantity(row.quantity);
      if (!activity || quantity === null) continue;
      totals[activity.key] = (totals[activity.key] ?? 0) + quantity;
    }
  }
  return totals;
}

// What the completion certificates have used of each schedule of rates
// activity. Transportation adds up its distance slabs, as its schedule of
// rates quantity does.
export function certifiedQuantityByActivity(
  jobOrders: CertifiedJobOrder[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  const byRow = certifiedQuantityByRow(jobOrders);
  for (const [key, quantity] of Object.entries(byRow)) {
    const activity = SOR_ROWS.get(key)!;
    totals[activity.sorActivity] =
      (totals[activity.sorActivity] ?? 0) + (quantity ?? 0);
  }
  return totals;
}

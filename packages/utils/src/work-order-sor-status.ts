import { WO_PROCESS, allActivityOptions } from "./constants";

export type EffectiveWorkOrderStatus = "pending" | "completed" | "cancelled";

// Only bioremediation records completion quantities.
export const SOR_ACTIVITY_TO_COMPLETION_ACTIVITY: Record<string, string> = {
  bioremediation_oil_contaminated_soil: "biorem_cont_soil",
};

// Restoration records no quantities: its activities are done once the
// restoration is marked complete.
const RESTORATION_ACTIVITIES = new Set<string>(
  allActivityOptions
    .filter((option) => !option.isBioremediation)
    .map((option) => option.value),
);

export function activityKey(name: string): string {
  const v = (name || "").trim().toLowerCase();
  return v
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function toNumberSafe(val: unknown): number {
  const n =
    typeof val === "string"
      ? Number(val.replace(/,/g, "").trim())
      : Number(val);
  return Number.isFinite(n) ? n : 0;
}

export interface ScheduleOfRateRow {
  activity: string;
  estimated_quantity: unknown;
}

export interface SiteWithCompletions {
  process_type?: string | null;
  is_completed?: boolean | null;
  completions?: Array<{
    activity_name: string;
    estimated_quantity?: unknown;
  }>;
}

export function computeSorFullyConsumed(
  scheduleOfRates: ScheduleOfRateRow[] | null | undefined,
  sites: SiteWithCompletions[] | null | undefined,
): boolean {
  if (!scheduleOfRates || scheduleOfRates.length === 0) return false;

  const usedQtyByActivity: Record<string, number> = (sites || []).reduce(
    (acc: Record<string, number>, s) => {
      for (const c of s.completions || []) {
        const key = activityKey(c.activity_name);
        acc[key] = (acc[key] || 0) + toNumberSafe(c.estimated_quantity);
      }
      return acc;
    },
    {},
  );

  const restorationCompleted = (sites || []).some(
    (s) => s.process_type === WO_PROCESS.RESTORATION && !!s.is_completed,
  );

  return scheduleOfRates.every((item) => {
    const sorQty = toNumberSafe(item.estimated_quantity);
    if (sorQty <= 0) return true;
    if (RESTORATION_ACTIVITIES.has(item.activity)) return restorationCompleted;

    const completionActivity =
      SOR_ACTIVITY_TO_COMPLETION_ACTIVITY[item.activity] ?? item.activity;
    const usedQty = usedQtyByActivity[activityKey(completionActivity)] ?? 0;
    return usedQty + 1e-6 >= sorQty;
  });
}

export function getEffectiveWorkOrderStatus(
  dbStatus: string,
  scheduleOfRates: ScheduleOfRateRow[] | null | undefined,
  sites: SiteWithCompletions[] | null | undefined,
): EffectiveWorkOrderStatus {
  const s = String(dbStatus ?? "").trim().toLowerCase();
  if (s === "cancelled") return "cancelled";
  if (s === "completed") return "completed";
  return computeSorFullyConsumed(scheduleOfRates, sites) ? "completed" : "pending";
}

export function effectiveWorkOrderStatusFromDbOnly(
  dbStatus: string,
): EffectiveWorkOrderStatus {
  const s = String(dbStatus ?? "")
    .trim()
    .toLowerCase();
  if (s === "cancelled") return "cancelled";
  if (s === "completed") return "completed";
  return "pending";
}

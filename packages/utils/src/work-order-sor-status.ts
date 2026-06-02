export type EffectiveWorkOrderStatus = "pending" | "completed" | "cancelled";

export const SOR_ACTIVITY_TO_COMPLETION_ACTIVITY: Record<string, string> = {
  clean_soil_area: "clean_soil_area",
  lifting_oily_slush_or_recovery_of_oil: "lifting_oil_slush",
  excavation_oil_contaminated_soil: "excav_cont_soil",
  transportation_contaminated_soil: "trans_cont_soil",
  refilling_excavated_oil_contaminated_soil_land: "refill_excav_soil",
  bioremediation_oil_contaminated_soil: "biorem_cont_soil",
};

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

  return scheduleOfRates.every((item) => {
    const completionActivity =
      SOR_ACTIVITY_TO_COMPLETION_ACTIVITY[item.activity] ?? item.activity;
    const usedQty = usedQtyByActivity[activityKey(completionActivity)] ?? 0;
    const sorQty = toNumberSafe(item.estimated_quantity);

    if (sorQty <= 0) return true;
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

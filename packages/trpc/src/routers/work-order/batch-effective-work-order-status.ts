import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "@pkg/db";
import { schema } from "@pkg/db";
import {
  getEffectiveWorkOrderStatus,
  type EffectiveWorkOrderStatus,
  type ScheduleOfRateRow,
  type SiteWithCompletions,
} from "@pkg/utils";
import type { AccessScope } from "../../access-scope";

const {
  workOrderSiteTable,
  scheduleOfRatesTable,
  cleaningUpSoilAreaTable,
  liftingRecoveryOilSlushTable,
  excavationContSoilTable,
  transportationContSoilTable,
  refillingExcavatedContSoilTable,
  bioremediationContSoilTable,
} = schema;

type WoRow = { id: number; office_id: number | null; status: string };

function nId(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function officeIsInAccessScope(
  scope: AccessScope,
  officeId: number | null | undefined,
): boolean {
  if (scope.kind !== "restricted") return true;
  if (officeId == null) return false;
  const oid = nId(officeId);
  if (!Number.isFinite(oid)) return false;
  return scope.officeIds.some((id: number) => nId(id) === oid);
}

function allowedWoSiteIdsForWorkOrder(
  scope: AccessScope,
  officeId: number | null | undefined,
  woId: number,
  sitesByWo: Map<number, { wo_site_id: number }[]>,
): number[] {
  const candidates = sitesByWo.get(woId) ?? [];

  if (scope.kind === "full") {
    return candidates.map((c) => nId(c.wo_site_id)).filter(Number.isFinite);
  }

  if (
    scope.kind === "restricted" &&
    officeId != null &&
    !officeIsInAccessScope(scope, officeId)
  ) {
    if (scope.workOrderSiteIds.length === 0) return [];
    const allow = new Set(scope.workOrderSiteIds.map((id) => nId(id)));
    return candidates
      .map((c) => nId(c.wo_site_id))
      .filter((wid) => Number.isFinite(wid) && allow.has(wid));
  }

  return candidates.map((c) => nId(c.wo_site_id)).filter(Number.isFinite);
}

async function fetchCompletionsByWoSiteId(
  db: Database,
  woSiteIds: number[],
): Promise<
  Map<number, Array<{ activity_name: string; estimated_quantity: unknown }>>
> {
  const result = new Map<
    number,
    Array<{ activity_name: string; estimated_quantity: unknown }>
  >();

  const push = (
    woSiteId: number,
    activityName: string,
    estimatedQuantity: unknown,
  ) => {
    const wid = nId(woSiteId);
    if (!Number.isFinite(wid)) return;
    const list = result.get(wid) ?? [];
    list.push({
      activity_name: activityName,
      estimated_quantity: estimatedQuantity,
    });
    result.set(wid, list);
  };

  if (woSiteIds.length === 0) return result;

  const [
    cleanSoilAreaExp,
    liftingOilExp,
    excavSoilExp,
    transSoilExp,
    refillSoilExp,
    bioremSoilExp,
  ] = await Promise.all([
    db
      .select()
      .from(cleaningUpSoilAreaTable)
      .where(
        and(
          inArray(cleaningUpSoilAreaTable.work_order_site_id, woSiteIds),
          eq(cleaningUpSoilAreaTable.type, "completion" as any),
        ),
      ),
    db
      .select()
      .from(liftingRecoveryOilSlushTable)
      .where(
        and(
          inArray(liftingRecoveryOilSlushTable.work_order_site_id, woSiteIds),
          eq(liftingRecoveryOilSlushTable.type, "completion" as any),
        ),
      ),
    db
      .select()
      .from(excavationContSoilTable)
      .where(
        and(
          inArray(excavationContSoilTable.work_order_site_id, woSiteIds),
          eq(excavationContSoilTable.type, "completion" as any),
        ),
      ),
    db
      .select()
      .from(transportationContSoilTable)
      .where(
        and(
          inArray(transportationContSoilTable.work_order_site_id, woSiteIds),
          eq(transportationContSoilTable.type, "completion" as any),
        ),
      ),
    db
      .select()
      .from(refillingExcavatedContSoilTable)
      .where(
        and(
          inArray(
            refillingExcavatedContSoilTable.work_order_site_id,
            woSiteIds,
          ),
          eq(refillingExcavatedContSoilTable.type, "completion" as any),
        ),
      ),
    db
      .select()
      .from(bioremediationContSoilTable)
      .where(
        and(
          inArray(bioremediationContSoilTable.work_order_site_id, woSiteIds),
          eq(bioremediationContSoilTable.type, "completion" as any),
        ),
      ),
  ]);

  for (const item of cleanSoilAreaExp) {
    push(item.work_order_site_id, "clean_soil_area", item.estimated_quantity);
  }
  for (const item of liftingOilExp) {
    push(item.work_order_site_id, "lifting_oil_slush", item.estimated_quantity);
  }
  for (const item of excavSoilExp) {
    push(item.work_order_site_id, "excav_cont_soil", item.estimated_quantity);
  }
  for (const item of transSoilExp) {
    push(item.work_order_site_id, "trans_cont_soil", item.estimated_quantity);
  }
  for (const item of refillSoilExp) {
    push(item.work_order_site_id, "refill_excav_soil", item.estimated_quantity);
  }
  for (const item of bioremSoilExp) {
    push(item.work_order_site_id, "biorem_cont_soil", item.estimated_quantity);
  }

  return result;
}

export async function batchEffectiveWorkOrderStatuses(
  db: Database,
  scope: AccessScope,
  rows: WoRow[],
): Promise<Map<number, EffectiveWorkOrderStatus>> {
  const out = new Map<number, EffectiveWorkOrderStatus>();
  if (rows.length === 0) return out;

  const woIds = [...new Set(rows.map((r) => nId(r.id)).filter(Number.isFinite))];

  const allWoSites = await db
    .select({
      wo_site_id: workOrderSiteTable.id,
      work_order_id: workOrderSiteTable.work_order_id,
    })
    .from(workOrderSiteTable)
    .where(inArray(workOrderSiteTable.work_order_id, woIds));

  const sitesByWo = new Map<number, { wo_site_id: number }[]>();
  for (const s of allWoSites) {
    const woid = nId(s.work_order_id);
    const wsid = nId(s.wo_site_id);
    if (!Number.isFinite(woid) || !Number.isFinite(wsid)) continue;
    const list = sitesByWo.get(woid) ?? [];
    list.push({ wo_site_id: wsid });
    sitesByWo.set(woid, list);
  }

  let allAllowedSiteIds: number[] = [];
  const allowedByWo = new Map<number, number[]>();
  for (const r of rows) {
    const rid = nId(r.id);
    if (!Number.isFinite(rid)) continue;
    const ids = allowedWoSiteIdsForWorkOrder(
      scope,
      r.office_id,
      rid,
      sitesByWo,
    );
    allowedByWo.set(rid, ids);
    allAllowedSiteIds = allAllowedSiteIds.concat(ids);
  }
  allAllowedSiteIds = [...new Set(allAllowedSiteIds)];

  const sorRows = await db
    .select({
      work_order_id: scheduleOfRatesTable.work_order_id,
      activity: scheduleOfRatesTable.activity,
      estimated_quantity: scheduleOfRatesTable.estimated_quantity,
    })
    .from(scheduleOfRatesTable)
    .where(inArray(scheduleOfRatesTable.work_order_id, woIds));

  const sorByWo = new Map<number, ScheduleOfRateRow[]>();
  for (const s of sorRows) {
    const woid = nId(s.work_order_id);
    if (!Number.isFinite(woid)) continue;
    const list = sorByWo.get(woid) ?? [];
    list.push({
      activity: s.activity,
      estimated_quantity: s.estimated_quantity,
    });
    sorByWo.set(woid, list);
  }

  const completionsBySite = await fetchCompletionsByWoSiteId(
    db,
    allAllowedSiteIds,
  );

  for (const r of rows) {
    const rid = nId(r.id);
    if (!Number.isFinite(rid)) continue;
    const allowed = allowedByWo.get(rid) ?? [];
    const sites: SiteWithCompletions[] = allowed.map((woSiteId) => ({
      completions: completionsBySite.get(woSiteId) ?? [],
    }));
    const sor = sorByWo.get(rid) ?? [];
    out.set(rid, getEffectiveWorkOrderStatus(String(r.status), sor, sites));
  }

  return out;
}

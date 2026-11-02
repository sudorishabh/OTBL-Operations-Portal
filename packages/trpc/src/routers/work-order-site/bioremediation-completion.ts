import { and, desc, eq, ne } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { constants } from "@pkg/utils";

const { workOrderSiteTable, bioSampleTable } = schema;
const { WO_PROCESS, WORK_ORDER_STATUS, ZERO_DAY_SAMPLE, TPH_TARGET } =
  constants;

// Either the database or a transaction on it.
type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// A bioremediation site is complete once its latest bio sample's TPH is below
// the target, and reopens if it no longer is. The zero day sample is only the
// baseline, so it doesn't count; a cancelled site is left alone.
export async function syncBioremediationCompletion(
  db: DbOrTx,
  workOrderSiteId: number,
): Promise<void> {
  const [row] = await db
    .select({
      process_type: workOrderSiteTable.process_type,
      status: workOrderSiteTable.status,
      is_completed: workOrderSiteTable.is_completed,
    })
    .from(workOrderSiteTable)
    .where(eq(workOrderSiteTable.id, workOrderSiteId));

  if (!row || row.process_type !== WO_PROCESS.BIOREMEDIATION) return;
  if (row.status === WORK_ORDER_STATUS.CANCELLED) return;

  const [latest] = await db
    .select({ tph: bioSampleTable.tph_value })
    .from(bioSampleTable)
    .where(
      and(
        eq(bioSampleTable.work_order_site_id, workOrderSiteId),
        ne(bioSampleTable.application_month, ZERO_DAY_SAMPLE),
      ),
    )
    .orderBy(desc(bioSampleTable.created_at), desc(bioSampleTable.id))
    .limit(1);

  const isComplete = !!latest && Number(latest.tph) < TPH_TARGET;

  if (isComplete !== row.is_completed) {
    await db
      .update(workOrderSiteTable)
      .set({ is_completed: isComplete })
      .where(eq(workOrderSiteTable.id, workOrderSiteId));
  }
}

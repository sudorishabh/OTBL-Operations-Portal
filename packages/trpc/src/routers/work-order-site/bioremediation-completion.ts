import { and, eq, sum } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { constants } from "@pkg/utils";

const {
  workOrderSiteTable,
  bioremediationContSoilTable,
  workOrderSiteExpenseTable,
} = schema;
const { WO_PROCESS, WORK_ORDER_STATUS, OIL_ZAPPER } = constants;

// Either the database or a transaction on it.
type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// Allowance for decimal rounding when comparing quantities.
const QTY_EPSILON = 0.001;

// A bioremediation site is complete once its expenses have used up the oil
// zapper planned with its estimate, and reopens if they no longer do. A site
// with no oil zapper planned is left alone, and so is a cancelled one.
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

  const [estimate] = await db
    .select({ planned: bioremediationContSoilTable.oil_zapper_quantity })
    .from(bioremediationContSoilTable)
    .where(
      and(
        eq(bioremediationContSoilTable.work_order_site_id, workOrderSiteId),
        eq(bioremediationContSoilTable.type, "estimate_sub-wo"),
      ),
    );
  const planned = Number(estimate?.planned ?? 0);
  if (!(planned > 0)) return;

  const [used] = await db
    .select({ quantity: sum(workOrderSiteExpenseTable.quantity) })
    .from(workOrderSiteExpenseTable)
    .where(
      and(
        eq(workOrderSiteExpenseTable.work_order_site_id, workOrderSiteId),
        eq(workOrderSiteExpenseTable.activity_key, OIL_ZAPPER.KEY),
      ),
    );
  const isComplete = Number(used?.quantity ?? 0) + QTY_EPSILON >= planned;

  if (isComplete !== row.is_completed) {
    await db
      .update(workOrderSiteTable)
      .set({ is_completed: isComplete })
      .where(eq(workOrderSiteTable.id, workOrderSiteId));
  }
}

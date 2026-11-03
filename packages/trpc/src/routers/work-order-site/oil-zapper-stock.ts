import { and, eq, sum } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { constants } from "@pkg/utils";

const {
  bioremediationContSoilTable,
  workOrderSiteExpenseTable,
  bioOilZappingTable,
} = schema;
const { OIL_ZAPPER } = constants;

// Either the database or a transaction on it.
type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// Allowance for decimal rounding when comparing quantities.
export const OIL_ZAPPER_EPSILON = 0.001;

export interface OilZapperStock {
  // The site's share of the schedule of rates: its estimated soil, in MT.
  sorQuantity: number | null;
  // Oil zapper planned with the site's estimate.
  estimated: number | null;
  // Bought through the site's expenses.
  procured: number;
  // Applied on site, from its oil zapping entries.
  used: number;
  // Procured but not yet applied.
  left: number;
}

const toNumber = (value: string | null | undefined) =>
  value != null ? Number(value) : null;

// A bioremediation site's oil zapper: what its estimate plans, what its
// expenses have procured, and what its oil zapping entries have applied.
export async function getOilZapperStock(
  db: DbOrTx,
  workOrderSiteId: number,
): Promise<OilZapperStock> {
  const [estimate] = await db
    .select({
      sorQuantity: bioremediationContSoilTable.estimated_quantity,
      estimated: bioremediationContSoilTable.oil_zapper_quantity,
    })
    .from(bioremediationContSoilTable)
    .where(
      and(
        eq(bioremediationContSoilTable.work_order_site_id, workOrderSiteId),
        eq(bioremediationContSoilTable.type, "estimate_sub-wo"),
      ),
    );

  const [procured] = await db
    .select({ quantity: sum(workOrderSiteExpenseTable.quantity) })
    .from(workOrderSiteExpenseTable)
    .where(
      and(
        eq(workOrderSiteExpenseTable.work_order_site_id, workOrderSiteId),
        eq(workOrderSiteExpenseTable.activity_key, OIL_ZAPPER.KEY),
      ),
    );

  const [used] = await db
    .select({ quantity: sum(bioOilZappingTable.estimated_quantity) })
    .from(bioOilZappingTable)
    .where(eq(bioOilZappingTable.work_order_site_id, workOrderSiteId));

  const procuredQty = Number(procured?.quantity ?? 0);
  const usedQty = Number(used?.quantity ?? 0);

  return {
    sorQuantity: toNumber(estimate?.sorQuantity),
    estimated: toNumber(estimate?.estimated),
    procured: procuredQty,
    used: usedQty,
    left: procuredQty - usedQty,
  };
}

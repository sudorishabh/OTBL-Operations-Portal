import { and, count, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { schema } from "@pkg/db";
import type { DbOrTx } from "./purchase-order-expenses";

const { workOrderSiteExpenseTable } = schema;

// What an expense on a sub-contract requirement costs: the quantity recorded
// at the site at the requirement's rate per unit, to the paisa.
export const subContractAmount = (quantity: number, unitRate: number) =>
  (quantity * unitRate).toFixed(2);

// Expenses recorded at the sites against each of the given requirements, by
// requirement. Those an order records itself don't count.
export async function countExpensesByItem(
  db: DbOrTx,
  itemIds: number[],
): Promise<Map<number, number>> {
  const byItem = new Map<number, number>();
  if (itemIds.length === 0) return byItem;

  const rows = await db
    .select({
      item_id: workOrderSiteExpenseTable.contract_order_item_id,
      total: count(),
    })
    .from(workOrderSiteExpenseTable)
    .where(
      and(
        inArray(workOrderSiteExpenseTable.contract_order_item_id, itemIds),
        eq(workOrderSiteExpenseTable.from_order, 0),
      ),
    )
    .groupBy(workOrderSiteExpenseTable.contract_order_item_id);
  for (const row of rows) {
    if (row.item_id !== null) byItem.set(row.item_id, row.total);
  }
  return byItem;
}

// Prices again, at its new rate, each expense recorded with a quantity
// against a requirement whose rate changed.
export async function repriceItemExpenses(
  tx: DbOrTx,
  items: { id: number; unit_rate: number }[],
) {
  for (const item of items) {
    await tx
      .update(workOrderSiteExpenseTable)
      .set({
        amount: sql`ROUND(${workOrderSiteExpenseTable.quantity} * ${item.unit_rate}, 2)`,
      })
      .where(
        and(
          eq(workOrderSiteExpenseTable.contract_order_item_id, item.id),
          eq(workOrderSiteExpenseTable.from_order, 0),
          isNotNull(workOrderSiteExpenseTable.quantity),
          gt(workOrderSiteExpenseTable.quantity, "0"),
        ),
      );
  }
}

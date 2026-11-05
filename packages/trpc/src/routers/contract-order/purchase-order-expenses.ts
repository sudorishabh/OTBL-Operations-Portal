import { and, count, eq, inArray, sum } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { constants } from "@pkg/utils";
import { businessRule } from "../../errors";
import {
  getOilZapperStock,
  OIL_ZAPPER_EPSILON,
} from "../work-order-site/oil-zapper-stock";

const {
  contractOrderTable,
  contractOrderItemTable,
  contractOrderContractorTable,
  workOrderSiteExpenseTable,
} = schema;
const { CONTRACT_ORDER_TYPE, OIL_ZAPPER } = constants;

// Either the database or a transaction on it.
type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// What a quantity of oil zapper costs at a purchase order's rate, with GST.
export const purchaseOrderAmount = (
  quantity: number,
  unitRate: number,
  gstPercentage: number,
) => quantity * unitRate * (1 + gstPercentage / 100);

// The oil zapper the given requirements' purchase order has recorded as
// procured, by site.
export async function orderRecordedOilZapper(
  db: DbOrTx,
  itemIds: number[],
): Promise<Map<number, number>> {
  const bySite = new Map<number, number>();
  if (itemIds.length === 0) return bySite;

  const rows = await db
    .select({
      site_id: workOrderSiteExpenseTable.work_order_site_id,
      quantity: sum(workOrderSiteExpenseTable.quantity),
    })
    .from(workOrderSiteExpenseTable)
    .where(
      and(
        inArray(workOrderSiteExpenseTable.contract_order_item_id, itemIds),
        eq(workOrderSiteExpenseTable.from_order, 1),
        eq(workOrderSiteExpenseTable.activity_key, OIL_ZAPPER.KEY),
      ),
    )
    .groupBy(workOrderSiteExpenseTable.work_order_site_id);
  for (const row of rows) bySite.set(row.site_id, Number(row.quantity ?? 0));
  return bySite;
}

// A site's procured oil zapper can't drop below what its oil zapping entries
// have already applied. Takes the change in procured oil zapper per site.
export async function assertOilZapperCovered(
  db: DbOrTx,
  changes: Map<number, number>,
) {
  for (const [siteId, change] of changes) {
    if (change >= 0) continue;
    const stock = await getOilZapperStock(db, siteId);
    if (stock.procured + change + OIL_ZAPPER_EPSILON < stock.used) {
      throw businessRule(
        `${stock.used.toFixed(2)} ${OIL_ZAPPER.UNIT} of oil zapper has already been applied at one of this order's sites, so the oil zapper bought for it can't drop below that.`,
      );
    }
  }
}

// Expenses recorded at the sites against the given requirements, as opposed
// to those their purchase order records itself.
export async function countSiteRecordedExpenses(
  db: DbOrTx,
  itemIds: number[],
) {
  if (itemIds.length === 0) return 0;
  const [result] = await db
    .select({ total: count() })
    .from(workOrderSiteExpenseTable)
    .where(
      and(
        inArray(workOrderSiteExpenseTable.contract_order_item_id, itemIds),
        eq(workOrderSiteExpenseTable.from_order, 0),
      ),
    );
  return result?.total ?? 0;
}

// Removes the expenses an order has recorded for the given requirements, so
// they can be recorded again from the order as it is now.
export async function clearOrderExpenses(tx: DbOrTx, itemIds: number[]) {
  if (itemIds.length === 0) return;
  await tx
    .delete(workOrderSiteExpenseTable)
    .where(
      and(
        inArray(workOrderSiteExpenseTable.contract_order_item_id, itemIds),
        eq(workOrderSiteExpenseTable.from_order, 1),
      ),
    );
}

// Records a purchase order's cost as one oil zapper expense per site, under
// its vendor and on the order's date: the site's quantity at the order's
// rate, with GST. Those expenses are the site's procured oil zapper.
export async function recordPurchaseOrderExpenses(
  tx: DbOrTx,
  orderId: number,
  createdBy: number,
) {
  const [order] = await tx
    .select({
      type: contractOrderTable.type,
      order_number: contractOrderTable.order_number,
      order_date: contractOrderTable.order_date,
      unit_rate: contractOrderTable.unit_rate,
      gst_percentage: contractOrderTable.gst_percentage,
      invoice_number: contractOrderTable.invoice_number,
    })
    .from(contractOrderTable)
    .where(eq(contractOrderTable.id, orderId));
  if (order?.type !== CONTRACT_ORDER_TYPE.PURCHASE_ORDER || !order.unit_rate) {
    return;
  }

  const [vendor] = await tx
    .select({ contractor_id: contractOrderContractorTable.contractor_id })
    .from(contractOrderContractorTable)
    .where(eq(contractOrderContractorTable.contract_order_id, orderId));
  const items = await tx
    .select({
      id: contractOrderItemTable.id,
      work_order_site_id: contractOrderItemTable.work_order_site_id,
      quantity: contractOrderItemTable.quantity,
    })
    .from(contractOrderItemTable)
    .where(
      and(
        eq(contractOrderItemTable.contract_order_id, orderId),
        eq(contractOrderItemTable.item, OIL_ZAPPER.KEY),
      ),
    );
  if (!vendor || items.length === 0) return;

  const unitRate = Number(order.unit_rate);
  const gstPercentage = Number(order.gst_percentage ?? 0);
  await tx.insert(workOrderSiteExpenseTable).values(
    items.map((item) => ({
      work_order_site_id: item.work_order_site_id,
      contractor_id: vendor.contractor_id,
      contract_order_item_id: item.id,
      from_order: 1,
      title: `${order.order_number}: ${OIL_ZAPPER.LABEL}`,
      amount: purchaseOrderAmount(
        Number(item.quantity),
        unitRate,
        gstPercentage,
      ).toFixed(2),
      start_date: order.order_date,
      end_date: order.order_date,
      invoice_number: order.invoice_number,
      activity_key: OIL_ZAPPER.KEY,
      quantity: item.quantity,
      documents: [],
      created_by: createdBy,
    })),
  );
}

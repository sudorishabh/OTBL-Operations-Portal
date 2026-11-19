import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { CODE_PREFIX, constants } from "@pkg/utils";
import { contractOrderSchemas } from "@pkg/schema";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertOfficeMember } from "../../helper/office-permissions";
import { businessRule, fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { nextCode } from "../../helper/record-code";
import type { TrpcContext } from "../../context";
import {
  assertOilZapperCovered,
  clearOrderExpenses,
  countSiteRecordedExpenses,
  orderRecordedOilZapper,
  recordPurchaseOrderExpenses,
} from "./purchase-order-expenses";
import {
  countExpensesByItem,
  repriceItemExpenses,
} from "./sub-contract-expenses";

const {
  workOrderTable,
  workOrderSiteTable,
  contractorTable,
  contractOrderTable,
  contractOrderItemTable,
  contractOrderContractorTable,
  workOrderSiteExpenseTable,
} = schema;
const {
  WO_PROCESS,
  CONTRACT_ORDER_ITEMS,
  CONTRACT_ORDER_TYPE,
  GST_PERCENTAGE,
  OIL_ZAPPER,
} = constants;

type OrderInput = {
  type: string;
  items: {
    id?: number;
    work_order_site_id: number;
    item: string;
    description?: string;
    quantity?: number | null;
    unit_rate?: number | null;
  }[];
  contractor_ids: number[];
  unit_rate?: number | null;
  gst_percentage?: number | null;
  invoice_number?: string;
  single_expense?: boolean;
};

const isPurchaseOrder = (order: { type: string }) =>
  order.type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER;

// A sub-contract whose requirements each take one expense at the site.
const takesSingleExpense = (order: OrderInput) =>
  !isPurchaseOrder(order) && !!order.single_expense;

// Purchase orders and sub-contracts are numbered apart.
const codePrefix = (order: { type: string }) =>
  isPurchaseOrder(order)
    ? CODE_PREFIX.PURCHASE_ORDER
    : CODE_PREFIX.SUB_CONTRACT;

const itemUnit = (item: string) =>
  CONTRACT_ORDER_ITEMS.find((option) => option.key === item)?.unit ?? "Nos";

// A purchase order's requirement keeps its quantity of oil zapper; a
// sub-contract's keeps its rate, as its quantities are recorded at the site.
const toItemValues = (
  order: OrderInput,
  orderId: number,
  item: OrderInput["items"][number],
) => ({
  contract_order_id: orderId,
  work_order_site_id: item.work_order_site_id,
  item: item.item,
  description: item.item === "other" ? (item.description ?? null) : null,
  quantity:
    isPurchaseOrder(order) && item.quantity ? item.quantity.toFixed(2) : null,
  unit: itemUnit(item.item),
  unit_rate:
    !isPurchaseOrder(order) && item.unit_rate
      ? item.unit_rate.toFixed(2)
      : null,
});

// A purchase order's cost. A sub-contract has none, as its expenses are
// recorded at its site.
const costValues = (input: OrderInput) =>
  isPurchaseOrder(input)
    ? {
        unit_rate: (input.unit_rate ?? 0).toFixed(2),
        gst_percentage: (input.gst_percentage ?? GST_PERCENTAGE).toFixed(2),
        invoice_number: input.invoice_number || null,
      }
    : { unit_rate: null, gst_percentage: null, invoice_number: null };

// The oil zapper a purchase order buys, by site.
const orderedOilZapper = (input: OrderInput) => {
  const bySite = new Map<number, number>();
  if (!isPurchaseOrder(input)) return bySite;
  for (const item of input.items) {
    if (item.item !== OIL_ZAPPER.KEY) continue;
    bySite.set(
      item.work_order_site_id,
      (bySite.get(item.work_order_site_id) ?? 0) + (item.quantity ?? 0),
    );
  }
  return bySite;
};

// How each site's procured oil zapper changes, from what the order recorded
// before to what it buys now.
const oilZapperChanges = (
  before: Map<number, number>,
  after: Map<number, number>,
) => {
  const changes = new Map<number, number>();
  for (const siteId of new Set([...before.keys(), ...after.keys()])) {
    changes.set(siteId, (after.get(siteId) ?? 0) - (before.get(siteId) ?? 0));
  }
  return changes;
};

// Only the work order's office operators and admins give out its orders.
async function assertManagesWorkOrder(ctx: TrpcContext, workOrderId: number) {
  const [workOrder] = await ctx.db
    .select({ office_id: workOrderTable.office_id })
    .from(workOrderTable)
    .where(eq(workOrderTable.id, workOrderId));

  if (!workOrder) {
    throw notFound("Work order", workOrderId);
  }
  await assertOfficeMember(ctx, workOrder.office_id);
}

// An order's requirements must be at the work order's bioremediation sites,
// and its vendors must exist.
async function assertOrderParts(
  ctx: TrpcContext,
  workOrderId: number,
  input: OrderInput,
) {
  const siteIds = [...new Set(input.items.map((i) => i.work_order_site_id))];
  const sites = await ctx.db
    .select({
      work_order_id: workOrderSiteTable.work_order_id,
      process_type: workOrderSiteTable.process_type,
    })
    .from(workOrderSiteTable)
    .where(inArray(workOrderSiteTable.id, siteIds));

  if (
    sites.length !== siteIds.length ||
    sites.some(
      (site) =>
        site.work_order_id !== workOrderId ||
        site.process_type !== WO_PROCESS.BIOREMEDIATION,
    )
  ) {
    throw businessRule(
      "Each requirement must be for one of this work order's bioremediation sites.",
    );
  }

  const contractorIds = [...new Set(input.contractor_ids)];
  const [vendors] = await ctx.db
    .select({ total: count() })
    .from(contractorTable)
    .where(inArray(contractorTable.id, contractorIds));

  if ((vendors?.total ?? 0) !== contractorIds.length) {
    throw businessRule("One of the chosen vendors no longer exists.");
  }
}

async function getOrder(ctx: TrpcContext, id: number) {
  const [order] = await ctx.db
    .select({
      work_order_id: contractOrderTable.work_order_id,
      type: contractOrderTable.type,
    })
    .from(contractOrderTable)
    .where(eq(contractOrderTable.id, id));

  if (!order) {
    throw notFound("Contract order", id);
  }
  return order;
}

async function getOrderItems(ctx: TrpcContext, orderId: number) {
  return ctx.db
    .select({
      id: contractOrderItemTable.id,
      work_order_site_id: contractOrderItemTable.work_order_site_id,
      unit_rate: contractOrderItemTable.unit_rate,
    })
    .from(contractOrderItemTable)
    .where(eq(contractOrderItemTable.contract_order_id, orderId));
}

async function getOrderItemIds(ctx: TrpcContext, orderId: number) {
  return (await getOrderItems(ctx, orderId)).map((item) => item.id);
}

// Expenses recorded at the sites against an order's items, optionally only
// those under the given vendors or items. Those a purchase order records
// itself are kept in step with it, so they don't count.
async function countOrderExpenses(
  ctx: TrpcContext,
  orderId: number,
  filter: { contractorIds?: number[]; itemIds?: number[] } = {},
) {
  const conditions = [
    eq(contractOrderItemTable.contract_order_id, orderId),
    eq(workOrderSiteExpenseTable.from_order, 0),
  ];
  if (filter.contractorIds) {
    conditions.push(
      inArray(workOrderSiteExpenseTable.contractor_id, filter.contractorIds),
    );
  }
  if (filter.itemIds) {
    conditions.push(inArray(contractOrderItemTable.id, filter.itemIds));
  }

  const [result] = await ctx.db
    .select({ total: count() })
    .from(workOrderSiteExpenseTable)
    .innerJoin(
      contractOrderItemTable,
      eq(
        workOrderSiteExpenseTable.contract_order_item_id,
        contractOrderItemTable.id,
      ),
    )
    .where(and(...conditions));
  return result?.total ?? 0;
}

export const contractOrderMutationRouter = router({
  // A purchase order records its cost at each of its sites as it is added.
  createContractOrder: protectedProcedure
    .input(contractOrderSchemas.createContractOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertManagesWorkOrder(ctx, input.work_order_id);
        await assertOrderParts(ctx, input.work_order_id, input);

        try {
          const id = await ctx.db.transaction(async (tx) => {
            const code = await nextCode(
              tx,
              contractOrderTable,
              codePrefix(input),
            );
            const [result] = await tx.insert(contractOrderTable).values({
              work_order_id: input.work_order_id,
              type: input.type,
              code,
              order_date: input.order_date,
              description: input.description || null,
              ...costValues(input),
              single_expense: takesSingleExpense(input) ? 1 : 0,
              documents: input.documents,
              completion_documents: input.completion_documents ?? [],
              created_by: Number(ctx.user!.sub),
            });
            const orderId = Number(result.insertId);

            await tx
              .insert(contractOrderItemTable)
              .values(
                input.items.map((item) => toItemValues(input, orderId, item)),
              );
            await tx.insert(contractOrderContractorTable).values(
              [...new Set(input.contractor_ids)].map((contractorId) => ({
                contract_order_id: orderId,
                contractor_id: contractorId,
              })),
            );
            await recordPurchaseOrderExpenses(
              tx,
              orderId,
              Number(ctx.user!.sub),
            );

            return orderId;
          });

          return { success: true, id };
        } catch (error) {
          throw fromDatabaseError(error, "Creating contract order");
        }
      }),
    ),

  // Keeps the items it is given by id, so expenses stay linked to them. An
  // item or vendor with expenses recorded at its site can't be dropped. A
  // purchase order records its cost again from the order as saved.
  updateContractOrder: protectedProcedure
    .input(contractOrderSchemas.updateContractOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const order = await getOrder(ctx, input.id);
        await assertManagesWorkOrder(ctx, order.work_order_id);
        await assertOrderParts(ctx, order.work_order_id, input);

        const existingItems = await getOrderItems(ctx, input.id);
        const existingItemIds = existingItems.map((item) => item.id);
        const keptItemIds = input.items
          .map((item) => item.id)
          .filter((id): id is number => id !== undefined);
        if (keptItemIds.some((id) => !existingItemIds.includes(id))) {
          throw businessRule("A requirement doesn't belong to this order.");
        }

        const droppedItemIds = existingItemIds.filter(
          (id) => !keptItemIds.includes(id),
        );
        if (
          droppedItemIds.length > 0 &&
          (await countOrderExpenses(ctx, input.id, {
            itemIds: droppedItemIds,
          })) > 0
        ) {
          throw businessRule(
            "A requirement with expenses recorded against it can't be removed.",
          );
        }

        // Its expenses stay at the site they were recorded at.
        const siteByItem = new Map(
          existingItems.map((item) => [item.id, item.work_order_site_id]),
        );
        const movedItemIds = input.items
          .filter(
            (item) =>
              item.id !== undefined &&
              siteByItem.get(item.id) !== item.work_order_site_id,
          )
          .map((item) => item.id!);
        if (
          movedItemIds.length > 0 &&
          (await countOrderExpenses(ctx, input.id, {
            itemIds: movedItemIds,
          })) > 0
        ) {
          throw businessRule(
            "A requirement with expenses recorded at its site can't move to another site.",
          );
        }

        // Each requirement of a single-expense sub-contract takes one.
        if (takesSingleExpense(input)) {
          const expensesByItem = await countExpensesByItem(ctx.db, keptItemIds);
          if ([...expensesByItem.values()].some((total) => total > 1)) {
            throw businessRule(
              "A requirement on this sub-contract already has several expenses, so it can't take just one. Delete the extra expenses first.",
            );
          }
        }

        // Expenses recorded at the sites before purchase orders kept their
        // own cost would count the oil zapper twice.
        if (
          isPurchaseOrder(input) &&
          (await countSiteRecordedExpenses(ctx.db, existingItemIds)) > 0
        ) {
          throw businessRule(
            "This order has expenses recorded at its sites. A purchase order now records its own cost from its rate, so delete those expenses first.",
          );
        }

        const contractorIds = [...new Set(input.contractor_ids)];
        const currentVendors = await ctx.db
          .select({ contractor_id: contractOrderContractorTable.contractor_id })
          .from(contractOrderContractorTable)
          .where(eq(contractOrderContractorTable.contract_order_id, input.id));
        const droppedVendorIds = currentVendors
          .map((vendor) => vendor.contractor_id)
          .filter((id) => !contractorIds.includes(id));
        if (
          droppedVendorIds.length > 0 &&
          (await countOrderExpenses(ctx, input.id, {
            contractorIds: droppedVendorIds,
          })) > 0
        ) {
          throw businessRule(
            "A vendor with expenses recorded under this order can't be removed.",
          );
        }

        await assertOilZapperCovered(
          ctx.db,
          oilZapperChanges(
            await orderRecordedOilZapper(ctx.db, existingItemIds),
            orderedOilZapper(input),
          ),
        );

        // A sub-contract requirement whose rate changes prices its expenses
        // again at the new rate.
        const rateByItem = new Map(
          existingItems.map((item) => [item.id, Number(item.unit_rate ?? 0)]),
        );
        const repricedItems = isPurchaseOrder(input)
          ? []
          : input.items.flatMap((item) =>
              item.id !== undefined &&
              item.unit_rate &&
              item.unit_rate !== rateByItem.get(item.id)
                ? [{ id: item.id, unit_rate: item.unit_rate }]
                : [],
            );

        try {
          await ctx.db.transaction(async (tx) => {
            await clearOrderExpenses(tx, existingItemIds);

            // An order that changes type is numbered as one of its new type.
            const code =
              order.type === input.type
                ? undefined
                : await nextCode(tx, contractOrderTable, codePrefix(input));
            await tx
              .update(contractOrderTable)
              .set({
                type: input.type,
                ...(code && { code }),
                order_date: input.order_date,
                description: input.description || null,
                ...costValues(input),
                single_expense: takesSingleExpense(input) ? 1 : 0,
                documents: input.documents,
                ...(input.completion_documents && {
                  completion_documents: input.completion_documents,
                }),
              })
              .where(eq(contractOrderTable.id, input.id));

            if (droppedItemIds.length > 0) {
              await tx
                .delete(contractOrderItemTable)
                .where(inArray(contractOrderItemTable.id, droppedItemIds));
            }
            for (const item of input.items) {
              const values = toItemValues(input, input.id, item);
              if (item.id) {
                await tx
                  .update(contractOrderItemTable)
                  .set(values)
                  .where(eq(contractOrderItemTable.id, item.id));
              } else {
                await tx.insert(contractOrderItemTable).values(values);
              }
            }
            await repriceItemExpenses(tx, repricedItems);

            await tx
              .delete(contractOrderContractorTable)
              .where(
                and(
                  eq(contractOrderContractorTable.contract_order_id, input.id),
                  notInArray(
                    contractOrderContractorTable.contractor_id,
                    contractorIds,
                  ),
                ),
              );
            const kept = new Set(
              currentVendors.map((vendor) => vendor.contractor_id),
            );
            const added = contractorIds.filter((id) => !kept.has(id));
            if (added.length > 0) {
              await tx.insert(contractOrderContractorTable).values(
                added.map((contractorId) => ({
                  contract_order_id: input.id,
                  contractor_id: contractorId,
                })),
              );
            }

            await recordPurchaseOrderExpenses(
              tx,
              input.id,
              Number(ctx.user!.sub),
            );
          });

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating contract order");
        }
      }),
    ),

  // Completion documents come in once the order's work is done, after it is
  // given out.
  setCompletionDocuments: protectedProcedure
    .input(contractOrderSchemas.setCompletionDocumentsSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const order = await getOrder(ctx, input.id);
        await assertManagesWorkOrder(ctx, order.work_order_id);

        try {
          await ctx.db
            .update(contractOrderTable)
            .set({ completion_documents: input.completion_documents })
            .where(eq(contractOrderTable.id, input.id));
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Saving completion documents");
        }
      }),
    ),

  // A purchase order's own expenses go with it; those recorded at the sites
  // must be deleted first.
  deleteContractOrder: protectedProcedure
    .input(contractOrderSchemas.contractOrderIdSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const order = await getOrder(ctx, input.id);
        await assertManagesWorkOrder(ctx, order.work_order_id);

        if ((await countOrderExpenses(ctx, input.id)) > 0) {
          throw businessRule(
            "This order has expenses recorded against it. Delete them first.",
          );
        }

        const itemIds = await getOrderItemIds(ctx, input.id);
        await assertOilZapperCovered(
          ctx.db,
          oilZapperChanges(
            await orderRecordedOilZapper(ctx.db, itemIds),
            new Map(),
          ),
        );

        try {
          await ctx.db.transaction(async (tx) => {
            await clearOrderExpenses(tx, itemIds);
            await tx
              .delete(contractOrderTable)
              .where(eq(contractOrderTable.id, input.id));
          });
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting contract order");
        }
      }),
    ),
});

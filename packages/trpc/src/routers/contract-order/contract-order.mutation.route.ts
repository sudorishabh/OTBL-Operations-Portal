import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { contractOrderSchemas } from "@pkg/schema";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertOfficeManager } from "../../helper/office-permissions";
import { businessRule, fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import type { TrpcContext } from "../../context";

const {
  workOrderTable,
  workOrderSiteTable,
  contractorTable,
  contractOrderTable,
  contractOrderItemTable,
  contractOrderContractorTable,
  workOrderSiteExpenseTable,
} = schema;
const { WO_PROCESS, CONTRACT_ORDER_ITEMS } = constants;

type OrderInput = {
  items: {
    id?: number;
    work_order_site_id: number;
    item: string;
    description?: string;
    quantity: number;
  }[];
  contractor_ids: number[];
};

const itemUnit = (item: string) =>
  CONTRACT_ORDER_ITEMS.find((option) => option.key === item)?.unit ?? "Nos";

const toItemValues = (orderId: number, item: OrderInput["items"][number]) => ({
  contract_order_id: orderId,
  work_order_site_id: item.work_order_site_id,
  item: item.item,
  description: item.item === "other" ? (item.description ?? null) : null,
  quantity: item.quantity.toFixed(2),
  unit: itemUnit(item.item),
});

// Only the office manager of the work order's office gives out its orders.
async function assertManagesWorkOrder(ctx: TrpcContext, workOrderId: number) {
  const [workOrder] = await ctx.db
    .select({ office_id: workOrderTable.office_id })
    .from(workOrderTable)
    .where(eq(workOrderTable.id, workOrderId));

  if (!workOrder) {
    throw notFound("Work order", workOrderId);
  }
  await assertOfficeManager(ctx, workOrder.office_id);
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
    .select({ work_order_id: contractOrderTable.work_order_id })
    .from(contractOrderTable)
    .where(eq(contractOrderTable.id, id));

  if (!order) {
    throw notFound("Contract order", id);
  }
  return order;
}

// Expenses recorded against an order's items, optionally only those under
// the given vendors or items.
async function countOrderExpenses(
  ctx: TrpcContext,
  orderId: number,
  filter: { contractorIds?: number[]; itemIds?: number[] } = {},
) {
  const conditions = [eq(contractOrderItemTable.contract_order_id, orderId)];
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
  createContractOrder: protectedProcedure
    .input(contractOrderSchemas.createContractOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertManagesWorkOrder(ctx, input.work_order_id);
        await assertOrderParts(ctx, input.work_order_id, input);

        try {
          const id = await ctx.db.transaction(async (tx) => {
            const [result] = await tx.insert(contractOrderTable).values({
              work_order_id: input.work_order_id,
              type: input.type,
              order_number: input.order_number,
              order_date: input.order_date,
              description: input.description || null,
              documents: input.documents,
              created_by: Number(ctx.user!.sub),
            });
            const orderId = Number(result.insertId);

            await tx
              .insert(contractOrderItemTable)
              .values(input.items.map((item) => toItemValues(orderId, item)));
            await tx.insert(contractOrderContractorTable).values(
              [...new Set(input.contractor_ids)].map((contractorId) => ({
                contract_order_id: orderId,
                contractor_id: contractorId,
              })),
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
  // item or vendor with expenses can't be dropped.
  updateContractOrder: protectedProcedure
    .input(contractOrderSchemas.updateContractOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const order = await getOrder(ctx, input.id);
        await assertManagesWorkOrder(ctx, order.work_order_id);
        await assertOrderParts(ctx, order.work_order_id, input);

        const existingItems = await ctx.db
          .select({ id: contractOrderItemTable.id })
          .from(contractOrderItemTable)
          .where(eq(contractOrderItemTable.contract_order_id, input.id));
        const existingItemIds = new Set(existingItems.map((item) => item.id));

        const keptItemIds = input.items
          .map((item) => item.id)
          .filter((id): id is number => id !== undefined);
        if (keptItemIds.some((id) => !existingItemIds.has(id))) {
          throw businessRule("A requirement doesn't belong to this order.");
        }

        const droppedItemIds = [...existingItemIds].filter(
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

        try {
          await ctx.db.transaction(async (tx) => {
            await tx
              .update(contractOrderTable)
              .set({
                type: input.type,
                order_number: input.order_number,
                order_date: input.order_date,
                description: input.description || null,
                documents: input.documents,
              })
              .where(eq(contractOrderTable.id, input.id));

            if (droppedItemIds.length > 0) {
              await tx
                .delete(contractOrderItemTable)
                .where(inArray(contractOrderItemTable.id, droppedItemIds));
            }
            for (const item of input.items) {
              const values = toItemValues(input.id, item);
              if (item.id) {
                await tx
                  .update(contractOrderItemTable)
                  .set(values)
                  .where(eq(contractOrderItemTable.id, item.id));
              } else {
                await tx.insert(contractOrderItemTable).values(values);
              }
            }

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
          });

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating contract order");
        }
      }),
    ),

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

        try {
          await ctx.db
            .delete(contractOrderTable)
            .where(eq(contractOrderTable.id, input.id));
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting contract order");
        }
      }),
    ),
});

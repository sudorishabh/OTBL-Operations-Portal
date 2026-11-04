import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { contractOrderSchemas } from "@pkg/schema";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessWorkOrder,
  assertCanAccessWorkOrderSite,
  getAccessScope,
} from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import type { TrpcContext } from "../../context";

const {
  siteTable,
  workOrderSiteTable,
  contractorTable,
  contractOrderTable,
  contractOrderItemTable,
  contractOrderContractorTable,
} = schema;

const accessScope = (ctx: TrpcContext) =>
  getAccessScope(ctx.db, Number(ctx.user!.sub), ctx.user!.role);

// The vendors of each of the given orders, by order.
async function vendorsByOrder(ctx: TrpcContext, orderIds: number[]) {
  const byOrder = new Map<number, { id: number; name: string }[]>();
  if (orderIds.length === 0) return byOrder;

  const rows = await ctx.db
    .select({
      contract_order_id: contractOrderContractorTable.contract_order_id,
      id: contractorTable.id,
      name: contractorTable.name,
    })
    .from(contractOrderContractorTable)
    .innerJoin(
      contractorTable,
      eq(contractOrderContractorTable.contractor_id, contractorTable.id),
    )
    .where(inArray(contractOrderContractorTable.contract_order_id, orderIds))
    .orderBy(asc(contractorTable.name));

  for (const row of rows) {
    const vendors = byOrder.get(row.contract_order_id) ?? [];
    vendors.push({ id: row.id, name: row.name });
    byOrder.set(row.contract_order_id, vendors);
  }
  return byOrder;
}

export const contractOrderQueryRouter = router({
  // The work order's bioremediation sites an order can require things at.
  getOrderableSites: protectedProcedure
    .input(contractOrderSchemas.getContractOrdersSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanAccessWorkOrder(
          ctx.db,
          await accessScope(ctx),
          input.work_order_id,
        );

        try {
          return await ctx.db
            .select({ id: workOrderSiteTable.id, name: siteTable.name })
            .from(workOrderSiteTable)
            .innerJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .where(
              and(
                eq(workOrderSiteTable.work_order_id, input.work_order_id),
                eq(
                  workOrderSiteTable.process_type,
                  constants.WO_PROCESS.BIOREMEDIATION,
                ),
              ),
            )
            .orderBy(asc(siteTable.name));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching orderable sites");
        }
      }),
    ),

  // A work order's purchase orders and sub-contracts, newest first, with the
  // requirement at each site and the vendors given the order.
  getContractOrders: protectedProcedure
    .input(contractOrderSchemas.getContractOrdersSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanAccessWorkOrder(
          ctx.db,
          await accessScope(ctx),
          input.work_order_id,
        );

        try {
          const orders = await ctx.db
            .select()
            .from(contractOrderTable)
            .where(eq(contractOrderTable.work_order_id, input.work_order_id))
            .orderBy(
              desc(contractOrderTable.order_date),
              desc(contractOrderTable.id),
            );
          const orderIds = orders.map((order) => order.id);
          if (orderIds.length === 0) return [];

          const items = await ctx.db
            .select({
              id: contractOrderItemTable.id,
              contract_order_id: contractOrderItemTable.contract_order_id,
              work_order_site_id: contractOrderItemTable.work_order_site_id,
              site_name: siteTable.name,
              item: contractOrderItemTable.item,
              description: contractOrderItemTable.description,
              quantity: contractOrderItemTable.quantity,
              unit: contractOrderItemTable.unit,
            })
            .from(contractOrderItemTable)
            .innerJoin(
              workOrderSiteTable,
              eq(contractOrderItemTable.work_order_site_id, workOrderSiteTable.id),
            )
            .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .where(inArray(contractOrderItemTable.contract_order_id, orderIds))
            .orderBy(asc(siteTable.name), asc(contractOrderItemTable.id));

          const vendors = await vendorsByOrder(ctx, orderIds);

          return orders.map((order) => ({
            ...order,
            items: items.filter((item) => item.contract_order_id === order.id),
            vendors: vendors.get(order.id) ?? [],
          }));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching contract orders");
        }
      }),
    ),

  // What contract orders require at one site, each with its order and the
  // vendors expenses can be recorded under.
  getSiteContractOrderItems: protectedProcedure
    .input(contractOrderSchemas.getSiteContractOrderItemsSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanAccessWorkOrderSite(
          ctx.db,
          await accessScope(ctx),
          input.work_order_site_id,
        );

        try {
          const items = await ctx.db
            .select({
              id: contractOrderItemTable.id,
              contract_order_id: contractOrderItemTable.contract_order_id,
              item: contractOrderItemTable.item,
              description: contractOrderItemTable.description,
              quantity: contractOrderItemTable.quantity,
              unit: contractOrderItemTable.unit,
              order_type: contractOrderTable.type,
              order_number: contractOrderTable.order_number,
              order_date: contractOrderTable.order_date,
            })
            .from(contractOrderItemTable)
            .innerJoin(
              contractOrderTable,
              eq(contractOrderItemTable.contract_order_id, contractOrderTable.id),
            )
            .where(
              eq(
                contractOrderItemTable.work_order_site_id,
                input.work_order_site_id,
              ),
            )
            .orderBy(
              asc(contractOrderTable.order_date),
              asc(contractOrderItemTable.id),
            );

          const vendors = await vendorsByOrder(ctx, [
            ...new Set(items.map((item) => item.contract_order_id)),
          ]);

          return items.map((item) => ({
            ...item,
            vendors: vendors.get(item.contract_order_id) ?? [],
          }));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching site contract order items");
        }
      }),
    ),
});

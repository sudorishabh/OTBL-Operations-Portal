import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  like,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";
import { schema } from "@pkg/db";
import { CODE_PREFIX, constants } from "@pkg/utils";
import { contractOrderSchemas } from "@pkg/schema";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessWorkOrder,
  assertCanAccessWorkOrderSite,
  getAccessScope,
} from "../../access-scope";
import { fromDatabaseError, notFound } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { codeMatches } from "../../helper/record-code";
import type { TrpcContext } from "../../context";
import { countExpensesByItem } from "./sub-contract-expenses";

const {
  siteTable,
  workOrderSiteTable,
  contractorTable,
  contractOrderTable,
  contractOrderItemTable,
  contractOrderContractorTable,
  workOrderSiteExpenseTable,
} = schema;

const accessScope = (ctx: TrpcContext) =>
  getAccessScope(ctx.db, Number(ctx.user!.sub), ctx.user!.role);

// The vendors of each of the given orders, by order.
async function vendorsByOrder(ctx: TrpcContext, orderIds: number[]) {
  const byOrder = new Map<
    number,
    { id: number; code: string; name: string }[]
  >();
  if (orderIds.length === 0) return byOrder;

  const rows = await ctx.db
    .select({
      contract_order_id: contractOrderContractorTable.contract_order_id,
      id: contractorTable.id,
      code: contractorTable.code,
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
    vendors.push({ id: row.id, code: row.code, name: row.name });
    byOrder.set(row.contract_order_id, vendors);
  }
  return byOrder;
}

// What the given orders require at each of their sites, by site name.
async function itemsOfOrders(ctx: TrpcContext, orderIds: number[]) {
  if (orderIds.length === 0) return [];
  return ctx.db
    .select({
      id: contractOrderItemTable.id,
      contract_order_id: contractOrderItemTable.contract_order_id,
      work_order_site_id: contractOrderItemTable.work_order_site_id,
      site_code: siteTable.code,
      site_name: siteTable.name,
      item: contractOrderItemTable.item,
      description: contractOrderItemTable.description,
      quantity: contractOrderItemTable.quantity,
      unit: contractOrderItemTable.unit,
      unit_rate: contractOrderItemTable.unit_rate,
    })
    .from(contractOrderItemTable)
    .innerJoin(
      workOrderSiteTable,
      eq(contractOrderItemTable.work_order_site_id, workOrderSiteTable.id),
    )
    .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
    .where(inArray(contractOrderItemTable.contract_order_id, orderIds))
    .orderBy(asc(siteTable.name), asc(contractOrderItemTable.id));
}

// A day's midnight in the server's time zone, as order dates are kept.
const startOfDay = (day: string) => new Date(`${day}T00:00:00`);
const dayAfter = (day: string) => {
  const date = startOfDay(day);
  date.setDate(date.getDate() + 1);
  return date;
};

// What an order must meet besides its work order and type: the search, the
// site, the vendor, whether completed and when dated.
function orderFilters(
  ctx: TrpcContext,
  input: z.infer<typeof contractOrderSchemas.getContractOrdersSchema>,
): (SQL | undefined)[] {
  const o = contractOrderTable;
  const items = contractOrderItemTable;
  const orderVendors = contractOrderContractorTable;
  const conditions: (SQL | undefined)[] = [];

  const term = input.search?.trim();
  if (term) {
    const pattern = `%${escapeLike(term)}%`;
    // The items whose names match, such as "JCB" for its key.
    const itemKeys = constants.CONTRACT_ORDER_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(term.toLowerCase()),
    ).map((item) => item.key);
    conditions.push(
      or(
        like(o.code, pattern),
        like(o.order_number, pattern),
        like(o.invoice_number, pattern),
        like(o.description, pattern),
        inArray(
          o.id,
          ctx.db
            .select({ id: orderVendors.contract_order_id })
            .from(orderVendors)
            .innerJoin(
              contractorTable,
              eq(orderVendors.contractor_id, contractorTable.id),
            )
            .where(
              or(
                like(contractorTable.name, pattern),
                like(contractorTable.code, pattern),
              ),
            ),
        ),
        inArray(
          o.id,
          ctx.db
            .select({ id: items.contract_order_id })
            .from(items)
            .innerJoin(
              workOrderSiteTable,
              eq(items.work_order_site_id, workOrderSiteTable.id),
            )
            .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .where(
              or(
                like(siteTable.name, pattern),
                like(siteTable.code, pattern),
                like(items.description, pattern),
                itemKeys.length > 0 ? inArray(items.item, itemKeys) : undefined,
              ),
            ),
        ),
      ),
    );
  }
  if (input.work_order_site_id) {
    conditions.push(
      inArray(
        o.id,
        ctx.db
          .select({ id: items.contract_order_id })
          .from(items)
          .where(eq(items.work_order_site_id, input.work_order_site_id)),
      ),
    );
  }
  if (input.vendor_id) {
    conditions.push(
      inArray(
        o.id,
        ctx.db
          .select({ id: orderVendors.contract_order_id })
          .from(orderVendors)
          .where(eq(orderVendors.contractor_id, input.vendor_id)),
      ),
    );
  }
  // Completed once its completion documents are in.
  if (input.completion === "completed") {
    conditions.push(sql`json_length(${o.completion_documents}) > 0`);
  } else if (input.completion === "pending") {
    conditions.push(
      sql`coalesce(json_length(${o.completion_documents}), 0) = 0`,
    );
  }
  // One day picked is that day alone.
  if (input.from) {
    conditions.push(
      gte(o.order_date, startOfDay(input.from)),
      lt(o.order_date, dayAfter(input.to ?? input.from)),
    );
  }
  return conditions;
}

export const contractOrderQueryRouter = router({
  // A page of the work order's bioremediation sites an order can be for, by
  // name, so an order form never loads them all at once.
  findOrderableSites: protectedProcedure
    .input(contractOrderSchemas.findOrderableSitesSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanAccessWorkOrder(
          ctx.db,
          await accessScope(ctx),
          input.work_order_id,
        );

        const { page, limit } = input;
        const search = input.search?.trim();
        const term = search ? `%${escapeLike(search)}%` : undefined;
        const where = and(
          eq(workOrderSiteTable.work_order_id, input.work_order_id),
          eq(workOrderSiteTable.process_type, constants.WO_PROCESS.BIOREMEDIATION),
          search && term
            ? or(
                codeMatches(siteTable.code, CODE_PREFIX.SITE, search),
                like(siteTable.name, term),
                like(siteTable.city, term),
              )
            : undefined,
        );

        try {
          const [totalRow] = await ctx.db
            .select({ total: count() })
            .from(workOrderSiteTable)
            .innerJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .where(where);
          const total = totalRow?.total ?? 0;

          const sites = await ctx.db
            .select({
              id: workOrderSiteTable.id,
              code: siteTable.code,
              name: siteTable.name,
              city: siteTable.city,
            })
            .from(workOrderSiteTable)
            .innerJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .where(where)
            // The id breaks ties so sites never repeat or go missing across
            // pages.
            .orderBy(asc(siteTable.name), asc(workOrderSiteTable.id))
            .limit(limit)
            .offset((page - 1) * limit);

          return {
            sites,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          };
        } catch (error) {
          throw fromDatabaseError(error, "Finding orderable sites");
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

        const { page, limit, sort } = input;
        const offset = (page - 1) * limit;
        const o = contractOrderTable;
        const inWorkOrder = eq(o.work_order_id, input.work_order_id);
        // Every filter but the type, so the type tabs count what they leave.
        const filtersWhere = and(inWorkOrder, ...orderFilters(ctx, input));
        const where = and(
          filtersWhere,
          input.type ? eq(o.type, input.type) : undefined,
        );

        try {
          const [typeCounts, [allRow], [totalRow], [purchaseRow], sites, vendors] =
            await Promise.all([
              ctx.db
                .select({ type: o.type, count: count() })
                .from(o)
                .where(filtersWhere)
                .groupBy(o.type),
              ctx.db.select({ count: count() }).from(o).where(inWorkOrder),
              ctx.db.select({ count: count() }).from(o).where(where),
              // What the purchase orders the filters leave cost in all, with
              // GST: each one's oil zapper at its rate.
              ctx.db
                .select({
                  total: sql<string>`sum(coalesce(${contractOrderItemTable.quantity}, 0) * ${o.unit_rate} * (1 + coalesce(${o.gst_percentage}, 0) / 100))`,
                })
                .from(contractOrderItemTable)
                .innerJoin(o, eq(contractOrderItemTable.contract_order_id, o.id))
                .where(
                  and(
                    where,
                    eq(o.type, constants.CONTRACT_ORDER_TYPE.PURCHASE_ORDER),
                    isNotNull(o.unit_rate),
                  ),
                ),
              // The sites and vendors the work order's orders name, to filter
              // by.
              ctx.db
                .selectDistinct({
                  id: workOrderSiteTable.id,
                  name: siteTable.name,
                  code: siteTable.code,
                })
                .from(contractOrderItemTable)
                .innerJoin(o, eq(contractOrderItemTable.contract_order_id, o.id))
                .innerJoin(
                  workOrderSiteTable,
                  eq(
                    contractOrderItemTable.work_order_site_id,
                    workOrderSiteTable.id,
                  ),
                )
                .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
                .where(inWorkOrder)
                .orderBy(asc(siteTable.name)),
              ctx.db
                .selectDistinct({
                  id: contractorTable.id,
                  name: contractorTable.name,
                  code: contractorTable.code,
                })
                .from(contractOrderContractorTable)
                .innerJoin(
                  o,
                  eq(contractOrderContractorTable.contract_order_id, o.id),
                )
                .innerJoin(
                  contractorTable,
                  eq(contractOrderContractorTable.contractor_id, contractorTable.id),
                )
                .where(inWorkOrder)
                .orderBy(asc(contractorTable.name)),
            ]);

          const orders = await ctx.db
            .select()
            .from(o)
            .where(where)
            .orderBy(
              ...(sort === "oldest"
                ? [asc(o.order_date), asc(o.id)]
                : [desc(o.order_date), desc(o.id)]),
            )
            .limit(limit)
            .offset(offset);
          const orderIds = orders.map((order) => order.id);
          const [items, vendorsOf] = await Promise.all([
            itemsOfOrders(ctx, orderIds),
            vendorsByOrder(ctx, orderIds),
          ]);

          const countOf = (type: string) =>
            Number(typeCounts.find((row) => row.type === type)?.count ?? 0);
          const total = Number(totalRow?.count ?? 0);

          return {
            orders: orders.map((order) => ({
              ...order,
              single_expense: !!order.single_expense,
              items: items.filter(
                (item) => item.contract_order_id === order.id,
              ),
              vendors: vendorsOf.get(order.id) ?? [],
            })),
            // Every order of the work order, whatever the filters.
            total_orders: Number(allRow?.count ?? 0),
            // How many of each type the other filters leave.
            counts: {
              all: typeCounts.reduce((sum, row) => sum + Number(row.count), 0),
              purchase_order: countOf(
                constants.CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
              ),
              sub_contract: countOf(constants.CONTRACT_ORDER_TYPE.SUB_CONTRACT),
            },
            purchase_total: Number(purchaseRow?.total ?? 0),
            sites,
            vendors,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasMore: offset + orders.length < total,
            },
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching contract orders");
        }
      }),
    ),

  // One order with everything about it: what it requires at each site, its
  // vendors, and every expense recorded against it, newest first. A
  // purchase order's own expenses, recorded from its rate, are among them.
  getContractOrderDetails: protectedProcedure
    .input(contractOrderSchemas.contractOrderIdSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const [order] = await ctx.db
          .select()
          .from(contractOrderTable)
          .where(eq(contractOrderTable.id, input.id));
        if (!order) throw notFound("Contract order", input.id);

        await assertCanAccessWorkOrder(
          ctx.db,
          await accessScope(ctx),
          order.work_order_id,
        );

        try {
          const items = await itemsOfOrders(ctx, [order.id]);
          const vendors = await vendorsByOrder(ctx, [order.id]);
          const itemIds = items.map((item) => item.id);

          const expenses =
            itemIds.length === 0
              ? []
              : await ctx.db
                  .select({
                    id: workOrderSiteExpenseTable.id,
                    contract_order_item_id:
                      workOrderSiteExpenseTable.contract_order_item_id,
                    work_order_site_id:
                      workOrderSiteExpenseTable.work_order_site_id,
                    description: workOrderSiteExpenseTable.description,
                    amount: workOrderSiteExpenseTable.amount,
                    quantity: workOrderSiteExpenseTable.quantity,
                    start_date: workOrderSiteExpenseTable.start_date,
                    end_date: workOrderSiteExpenseTable.end_date,
                    invoice_number: workOrderSiteExpenseTable.invoice_number,
                    is_exceeded: workOrderSiteExpenseTable.is_exceeded,
                    from_order: workOrderSiteExpenseTable.from_order,
                    documents: workOrderSiteExpenseTable.documents,
                    vendor_id: contractorTable.id,
                    vendor_name: contractorTable.name,
                  })
                  .from(workOrderSiteExpenseTable)
                  .leftJoin(
                    contractorTable,
                    eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
                  )
                  .where(
                    inArray(
                      workOrderSiteExpenseTable.contract_order_item_id,
                      itemIds,
                    ),
                  )
                  .orderBy(
                    desc(workOrderSiteExpenseTable.start_date),
                    desc(workOrderSiteExpenseTable.id),
                  );

          return {
            ...order,
            single_expense: !!order.single_expense,
            items,
            vendors: vendors.get(order.id) ?? [],
            expenses: expenses.map((expense) => ({
              ...expense,
              amount: Number(expense.amount),
              quantity:
                expense.quantity === null ? null : Number(expense.quantity),
              is_exceeded: !!expense.is_exceeded,
              from_order: !!expense.from_order,
            })),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching contract order details");
        }
      }),
    ),

  // What contract orders require at one site, each with its order, the
  // vendors expenses can be recorded under, and how many have been.
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
              unit_rate: contractOrderItemTable.unit_rate,
              order_type: contractOrderTable.type,
              order_code: contractOrderTable.code,
              order_number: contractOrderTable.order_number,
              order_date: contractOrderTable.order_date,
              single_expense: contractOrderTable.single_expense,
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
          const expenseCounts = await countExpensesByItem(
            ctx.db,
            items.map((item) => item.id),
          );

          return items.map((item) => ({
            ...item,
            single_expense: !!item.single_expense,
            vendors: vendors.get(item.contract_order_id) ?? [],
            expense_count: expenseCounts.get(item.id) ?? 0,
          }));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching site contract order items");
        }
      }),
    ),
});

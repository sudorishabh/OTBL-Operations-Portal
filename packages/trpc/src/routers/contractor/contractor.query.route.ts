import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  exists,
  like,
  not,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { fromDatabaseError, notFound } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { z } from "zod";
import { assertCanUseVendors, canUseVendors } from "./vendor-access";
import { codeMatches } from "../../helper/record-code";
import { CODE_PREFIX } from "@pkg/utils";
import { getAccessScope, workOrderScopeWhere } from "../../access-scope";
import type { TrpcContext } from "../../context";

const {
  contractorTable,
  workOrderTable,
  workOrderSiteTable,
  contractOrderTable,
  contractOrderContractorTable,
  contractOrderItemTable,
  jobOrderTable,
  jobOrderContractorTable,
  workOrderSiteExpenseTable,
} = schema;

const searchWhere = (search: string | undefined) => {
  const trimmed = search?.trim();
  if (!trimmed) return undefined;
  const term = `%${escapeLike(trimmed)}%`;
  return or(
    codeMatches(contractorTable.code, CODE_PREFIX.VENDOR, trimmed),
    like(contractorTable.name, term),
    like(contractorTable.contact_number, term),
    like(contractorTable.email, term),
    like(contractorTable.gst_number, term),
    like(contractorTable.state, term),
  );
};

// How a vendors list can be narrowed by the orders vendors are on.
const vendorUsageEnum = z.enum([
  "purchase_order",
  "sub_contract",
  "job_order",
  "unused",
]);

const vendorOrder = (sort: "name_asc" | "name_desc" | "newest" | "oldest") => {
  switch (sort) {
    case "name_desc":
      return [desc(contractorTable.name), desc(contractorTable.id)];
    case "newest":
      return [desc(contractorTable.created_at), desc(contractorTable.id)];
    case "oldest":
      return [asc(contractorTable.created_at), asc(contractorTable.id)];
    default:
      return [asc(contractorTable.name), asc(contractorTable.id)];
  }
};

// A vendor's orders and job orders are read a page at a time.
const vendorWorkPageSchema = z.object({
  id: z.number().positive(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// The work orders the user can see, as a condition on workOrderTable.
const visibleWorkOrders = async (ctx: TrpcContext) =>
  workOrderScopeWhere(
    await getAccessScope(ctx.db, Number(ctx.user!.sub), ctx.user!.role),
  );

// How a vendor's orders and job orders join their work orders.
const ORDER_OF_VENDOR = eq(
  contractOrderContractorTable.contract_order_id,
  contractOrderTable.id,
);
const WORK_ORDER_OF_ORDER = eq(
  contractOrderTable.work_order_id,
  workOrderTable.id,
);
const JOB_ORDER_OF_VENDOR = eq(
  jobOrderContractorTable.job_order_id,
  jobOrderTable.id,
);
const SITE_OF_JOB_ORDER = eq(
  jobOrderTable.work_order_site_id,
  workOrderSiteTable.id,
);
const WORK_ORDER_OF_SITE = eq(
  workOrderSiteTable.work_order_id,
  workOrderTable.id,
);

const toSpent = <T extends { spent: string | null }>(row: T) => ({
  ...row,
  spent: Number(row.spent ?? 0),
});

const pageOf = (
  input: { page: number; limit: number },
  total: number,
  shown: number,
) => ({
  page: input.page,
  limit: input.limit,
  total,
  totalPages: Math.ceil(total / input.limit),
  hasMore: (input.page - 1) * input.limit + shown < total,
});

export const contractorQueryRouter = router({
  // Every vendor, paginated, for the vendors page.
  getVendors: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        usage: vendorUsageEnum.optional(),
        sort: z
          .enum(["name_asc", "name_desc", "newest", "oldest"])
          .default("name_asc"),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { page, limit, search, usage, sort } = input;

        if (!(await canUseVendors(ctx))) {
          return {
            vendors: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          };
        }

        // Orders count only in work orders the user can see, as on a
        // vendor's own page.
        const visibleWorkOrders = usage
          ? workOrderScopeWhere(
              await getAccessScope(
                ctx.db,
                Number(ctx.user!.sub),
                ctx.user!.role,
              ),
            )
          : undefined;

        const onContractOrder = (type?: "purchase_order" | "sub_contract") =>
          exists(
            ctx.db
              .select({ one: sql`1` })
              .from(contractOrderContractorTable)
              .innerJoin(
                contractOrderTable,
                eq(
                  contractOrderContractorTable.contract_order_id,
                  contractOrderTable.id,
                ),
              )
              .innerJoin(
                workOrderTable,
                eq(contractOrderTable.work_order_id, workOrderTable.id),
              )
              .where(
                and(
                  eq(
                    contractOrderContractorTable.contractor_id,
                    contractorTable.id,
                  ),
                  type ? eq(contractOrderTable.type, type) : undefined,
                  visibleWorkOrders,
                ),
              ),
          );

        const onJobOrder = () =>
          exists(
            ctx.db
              .select({ one: sql`1` })
              .from(jobOrderContractorTable)
              .innerJoin(
                jobOrderTable,
                eq(jobOrderContractorTable.job_order_id, jobOrderTable.id),
              )
              .innerJoin(
                workOrderSiteTable,
                eq(jobOrderTable.work_order_site_id, workOrderSiteTable.id),
              )
              .innerJoin(
                workOrderTable,
                eq(workOrderSiteTable.work_order_id, workOrderTable.id),
              )
              .where(
                and(
                  eq(jobOrderContractorTable.contractor_id, contractorTable.id),
                  visibleWorkOrders,
                ),
              ),
          );

        const usageWhere: Record<z.infer<typeof vendorUsageEnum>, () => SQL> = {
          purchase_order: () => onContractOrder("purchase_order"),
          sub_contract: () => onContractOrder("sub_contract"),
          job_order: onJobOrder,
          unused: () => and(not(onContractOrder()), not(onJobOrder()))!,
        };

        const where = and(
          searchWhere(search),
          usage ? usageWhere[usage]() : undefined,
        );

        try {
          const [totalRow] = await ctx.db
            .select({ total: count() })
            .from(contractorTable)
            .where(where);
          const total = totalRow?.total ?? 0;

          const vendors = await ctx.db
            .select()
            .from(contractorTable)
            .where(where)
            // The id breaks ties so vendors never repeat or go missing across pages.
            .orderBy(...vendorOrder(sort))
            .limit(limit)
            .offset((page - 1) * limit);

          return {
            vendors,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasMore: page * limit < total,
            },
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching vendors");
        }
      }),
    ),

  // Every vendor by name, for pickers.
  getContractors: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanUseVendors(ctx);

        try {
          const contractors = await ctx.db
            .select()
            .from(contractorTable)
            .where(searchWhere(input.search))
            .orderBy(asc(contractorTable.name));

          return { contractors };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching contractors");
        }
      }),
    ),

  getContractor: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanUseVendors(ctx);

        try {
          const [contractor] = await ctx.db
            .select()
            .from(contractorTable)
            .where(eq(contractorTable.id, input.id));

          if (!contractor) {
            throw notFound("Contractor", input.id);
          }

          return { contractor };
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error)
            throw error;
          throw fromDatabaseError(error, "Fetching contractor");
        }
      }),
    ),
  // The purchase orders, sub-contracts and job orders a vendor is on, in
  // work orders the user can see, each with what has been spent under them.
  // What a vendor's page sums up: how many orders and job orders they are on
  // and what has been spent under them, of the work orders the user can see.
  getContractorWork: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanUseVendors(ctx);
        const visible = await visibleWorkOrders(ctx);

        try {
          const [[orderRow], [jobOrderRow], [orderSpent], [jobOrderSpent]] =
            await Promise.all([
              ctx.db
                .select({
                  count: countDistinct(contractOrderTable.id),
                })
                .from(contractOrderContractorTable)
                .innerJoin(contractOrderTable, ORDER_OF_VENDOR)
                .innerJoin(workOrderTable, WORK_ORDER_OF_ORDER)
                .where(
                  and(
                    eq(contractOrderContractorTable.contractor_id, input.id),
                    visible,
                  ),
                ),
              ctx.db
                .select({
                  count: countDistinct(jobOrderTable.id),
                })
                .from(jobOrderContractorTable)
                .innerJoin(jobOrderTable, JOB_ORDER_OF_VENDOR)
                .innerJoin(workOrderSiteTable, SITE_OF_JOB_ORDER)
                .innerJoin(workOrderTable, WORK_ORDER_OF_SITE)
                .where(
                  and(
                    eq(jobOrderContractorTable.contractor_id, input.id),
                    visible,
                  ),
                ),
              // The vendor's expenses on the requirements of orders they are
              // on, and on job orders they are on.
              ctx.db
                .select({ total: sum(workOrderSiteExpenseTable.amount) })
                .from(workOrderSiteExpenseTable)
                .innerJoin(
                  contractOrderItemTable,
                  eq(
                    workOrderSiteExpenseTable.contract_order_item_id,
                    contractOrderItemTable.id,
                  ),
                )
                .innerJoin(
                  contractOrderTable,
                  eq(
                    contractOrderItemTable.contract_order_id,
                    contractOrderTable.id,
                  ),
                )
                .innerJoin(
                  contractOrderContractorTable,
                  and(
                    eq(
                      contractOrderContractorTable.contract_order_id,
                      contractOrderTable.id,
                    ),
                    eq(contractOrderContractorTable.contractor_id, input.id),
                  ),
                )
                .innerJoin(
                  workOrderTable,
                  eq(contractOrderTable.work_order_id, workOrderTable.id),
                )
                .where(
                  and(
                    eq(workOrderSiteExpenseTable.contractor_id, input.id),
                    visible,
                  ),
                ),
              ctx.db
                .select({ total: sum(workOrderSiteExpenseTable.amount) })
                .from(workOrderSiteExpenseTable)
                .innerJoin(
                  jobOrderTable,
                  eq(workOrderSiteExpenseTable.job_order_id, jobOrderTable.id),
                )
                .innerJoin(
                  jobOrderContractorTable,
                  and(
                    eq(jobOrderContractorTable.job_order_id, jobOrderTable.id),
                    eq(jobOrderContractorTable.contractor_id, input.id),
                  ),
                )
                .innerJoin(
                  workOrderSiteTable,
                  eq(jobOrderTable.work_order_site_id, workOrderSiteTable.id),
                )
                .innerJoin(
                  workOrderTable,
                  eq(workOrderSiteTable.work_order_id, workOrderTable.id),
                )
                .where(
                  and(
                    eq(workOrderSiteExpenseTable.contractor_id, input.id),
                    visible,
                  ),
                ),
            ]);

          return {
            order_count: Number(orderRow?.count ?? 0),
            job_order_count: Number(jobOrderRow?.count ?? 0),
            total_spent:
              Number(orderSpent?.total ?? 0) +
              Number(jobOrderSpent?.total ?? 0),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching contractor work");
        }
      }),
    ),

  // A page of the purchase orders and sub-contracts a vendor is on, newest
  // first, each with what the vendor has spent under it.
  getContractorOrders: protectedProcedure.input(vendorWorkPageSchema).query(
    handleQuery(async ({ input, ctx }) => {
      await assertCanUseVendors(ctx);
      const visible = await visibleWorkOrders(ctx);
      const offset = (input.page - 1) * input.limit;

      try {
        const [[totalRow], rows] = await Promise.all([
          ctx.db
            .select({
              count: countDistinct(contractOrderTable.id),
            })
            .from(contractOrderContractorTable)
            .innerJoin(contractOrderTable, ORDER_OF_VENDOR)
            .innerJoin(workOrderTable, WORK_ORDER_OF_ORDER)
            .where(
              and(
                eq(contractOrderContractorTable.contractor_id, input.id),
                visible,
              ),
            ),
          ctx.db
            .select({
              id: contractOrderTable.id,
              type: contractOrderTable.type,
              code: contractOrderTable.code,
              order_number: contractOrderTable.order_number,
              order_date: contractOrderTable.order_date,
              work_order_id: workOrderTable.id,
              work_order_code: workOrderTable.code,
              spent: sum(workOrderSiteExpenseTable.amount),
              expense_count: count(workOrderSiteExpenseTable.id),
            })
            .from(contractOrderContractorTable)
            .innerJoin(contractOrderTable, ORDER_OF_VENDOR)
            .innerJoin(workOrderTable, WORK_ORDER_OF_ORDER)
            .leftJoin(
              contractOrderItemTable,
              eq(
                contractOrderItemTable.contract_order_id,
                contractOrderTable.id,
              ),
            )
            .leftJoin(
              workOrderSiteExpenseTable,
              and(
                eq(
                  workOrderSiteExpenseTable.contract_order_item_id,
                  contractOrderItemTable.id,
                ),
                eq(workOrderSiteExpenseTable.contractor_id, input.id),
              ),
            )
            .where(
              and(
                eq(contractOrderContractorTable.contractor_id, input.id),
                visible,
              ),
            )
            .groupBy(contractOrderTable.id, workOrderTable.id)
            .orderBy(
              desc(contractOrderTable.order_date),
              desc(contractOrderTable.id),
            )
            .limit(input.limit)
            .offset(offset),
        ]);

        const total = Number(totalRow?.count ?? 0);
        return {
          orders: rows.map(toSpent),
          pagination: pageOf(input, total, rows.length),
        };
      } catch (error) {
        throw fromDatabaseError(error, "Fetching contractor orders");
      }
    }),
  ),

  // A page of the restoration job orders a vendor is on, latest first, each
  // with what the vendor has spent under it.
  getContractorJobOrders: protectedProcedure.input(vendorWorkPageSchema).query(
    handleQuery(async ({ input, ctx }) => {
      await assertCanUseVendors(ctx);
      const visible = await visibleWorkOrders(ctx);
      const offset = (input.page - 1) * input.limit;

      try {
        const [[totalRow], rows] = await Promise.all([
          ctx.db
            .select({
              count: countDistinct(jobOrderTable.id),
            })
            .from(jobOrderContractorTable)
            .innerJoin(jobOrderTable, JOB_ORDER_OF_VENDOR)
            .innerJoin(workOrderSiteTable, SITE_OF_JOB_ORDER)
            .innerJoin(workOrderTable, WORK_ORDER_OF_SITE)
            .where(
              and(eq(jobOrderContractorTable.contractor_id, input.id), visible),
            ),
          ctx.db
            .select({
              id: jobOrderTable.id,
              jo_number: jobOrderTable.jo_number,
              installation_name: jobOrderTable.installation_name,
              location: jobOrderTable.location,
              start_date: jobOrderTable.start_date,
              end_date: jobOrderTable.end_date,
              work_order_id: workOrderTable.id,
              work_order_code: workOrderTable.code,
              spent: sum(workOrderSiteExpenseTable.amount),
              expense_count: count(workOrderSiteExpenseTable.id),
            })
            .from(jobOrderContractorTable)
            .innerJoin(jobOrderTable, JOB_ORDER_OF_VENDOR)
            .innerJoin(workOrderSiteTable, SITE_OF_JOB_ORDER)
            .innerJoin(workOrderTable, WORK_ORDER_OF_SITE)
            .leftJoin(
              workOrderSiteExpenseTable,
              and(
                eq(workOrderSiteExpenseTable.job_order_id, jobOrderTable.id),
                eq(workOrderSiteExpenseTable.contractor_id, input.id),
              ),
            )
            .where(
              and(eq(jobOrderContractorTable.contractor_id, input.id), visible),
            )
            .groupBy(jobOrderTable.id, workOrderTable.id)
            .orderBy(desc(jobOrderTable.start_date), desc(jobOrderTable.id))
            .limit(input.limit)
            .offset(offset),
        ]);

        const total = Number(totalRow?.count ?? 0);
        return {
          jobOrders: rows.map(toSpent),
          pagination: pageOf(input, total, rows.length),
        };
      } catch (error) {
        throw fromDatabaseError(error, "Fetching contractor job orders");
      }
    }),
  ),
});

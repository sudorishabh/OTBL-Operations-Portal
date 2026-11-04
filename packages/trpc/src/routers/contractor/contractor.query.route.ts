import { and, asc, count, desc, eq, like, or, sum } from "drizzle-orm";
import { schema } from "@pkg/db";
import { vendorSchemas } from "@pkg/schema";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { fromDatabaseError, notFound } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { z } from "zod";
import { assertCanUseVendors, canUseVendors } from "./vendor-access";
import { getAccessScope, workOrderScopeWhere } from "../../access-scope";

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
  const term = search?.trim() ? `%${escapeLike(search.trim())}%` : null;
  return term
    ? or(
        like(contractorTable.name, term),
        like(contractorTable.contact_number, term),
        like(contractorTable.email, term),
        like(contractorTable.gst_number, term),
      )
    : undefined;
};

export const contractorQueryRouter = router({
  // Every vendor or sub-contractor, paginated, for their pages.
  getVendors: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        type: vendorSchemas.contractorTypeEnum.optional(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { page, limit, search, status, type } = input;

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

        const where = and(
          status ? eq(contractorTable.status, status) : undefined,
          type ? eq(contractorTable.type, type) : undefined,
          searchWhere(search),
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
            .orderBy(asc(contractorTable.name))
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
  // The purchase orders, sub-contracts and job orders a vendor or
  // sub-contractor is on, in work orders the user can see, each with what has
  // been spent under them.
  getContractorWork: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanUseVendors(ctx);
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        const visibleWorkOrders = workOrderScopeWhere(scope);

        try {
          const contractOrders = await ctx.db
            .select({
              id: contractOrderTable.id,
              type: contractOrderTable.type,
              order_number: contractOrderTable.order_number,
              order_date: contractOrderTable.order_date,
              work_order_id: workOrderTable.id,
              work_order_code: workOrderTable.code,
              work_order_title: workOrderTable.title,
              spent: sum(workOrderSiteExpenseTable.amount),
              expense_count: count(workOrderSiteExpenseTable.id),
            })
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
            .leftJoin(
              contractOrderItemTable,
              eq(contractOrderItemTable.contract_order_id, contractOrderTable.id),
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
                visibleWorkOrders,
              ),
            )
            .groupBy(contractOrderTable.id, workOrderTable.id)
            .orderBy(desc(contractOrderTable.order_date));

          const jobOrders = await ctx.db
            .select({
              id: jobOrderTable.id,
              jo_number: jobOrderTable.jo_number,
              title: jobOrderTable.title,
              start_date: jobOrderTable.start_date,
              end_date: jobOrderTable.end_date,
              work_order_id: workOrderTable.id,
              work_order_code: workOrderTable.code,
              work_order_title: workOrderTable.title,
              spent: sum(workOrderSiteExpenseTable.amount),
              expense_count: count(workOrderSiteExpenseTable.id),
            })
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
            .leftJoin(
              workOrderSiteExpenseTable,
              and(
                eq(workOrderSiteExpenseTable.job_order_id, jobOrderTable.id),
                eq(workOrderSiteExpenseTable.contractor_id, input.id),
              ),
            )
            .where(
              and(
                eq(jobOrderContractorTable.contractor_id, input.id),
                visibleWorkOrders,
              ),
            )
            .groupBy(jobOrderTable.id, workOrderTable.id)
            .orderBy(desc(jobOrderTable.start_date));

          const toSpent = <T extends { spent: string | null }>(row: T) => ({
            ...row,
            spent: Number(row.spent ?? 0),
          });

          return {
            contractOrders: contractOrders.map(toSpent),
            jobOrders: jobOrders.map(toSpent),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching contractor work");
        }
      }),
    ),
});

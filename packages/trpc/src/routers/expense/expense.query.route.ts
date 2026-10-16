import { eq, sum, desc, and, ne, count } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessWorkOrder,
  assertCanAccessWorkOrderSite,
  getAccessScope,
} from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { siteNameOrRestoration } from "../../helper/restoration";
import { z } from "zod";

const {
  workOrderSiteExpenseTable,
  contractorTable,
  workOrderSiteTable,
  siteTable,
  bioremediationContSoilTable,
} = schema;

export const expenseQueryRouter = router({
  getExpenses: protectedProcedure
    .input(z.object({
      work_order_site_id: z.number().positive(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id, page, limit } = input;
        const offset = (page - 1) * limit;

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

        try {
          const [totalResult] = await ctx.db
            .select({ count: count() })
            .from(workOrderSiteExpenseTable)
            .where(eq(workOrderSiteExpenseTable.work_order_site_id, work_order_site_id));

          const total = totalResult?.count ?? 0;

          if (total === 0) {
            return {
              expenses: [],
              pagination: { page, limit, total, totalPages: 0, hasMore: false },
            };
          }

          const expenses = await ctx.db
            .select({
              id: workOrderSiteExpenseTable.id,
              work_order_site_id: workOrderSiteExpenseTable.work_order_site_id,
              contractor_id: workOrderSiteExpenseTable.contractor_id,
              contractor_name: contractorTable.name,
              activity_key: workOrderSiteExpenseTable.activity_key,
              quantity: workOrderSiteExpenseTable.quantity,
              is_exceeded: workOrderSiteExpenseTable.is_exceeded,
              description: workOrderSiteExpenseTable.description,
              amount: workOrderSiteExpenseTable.amount,
              expense_date: workOrderSiteExpenseTable.expense_date,
              invoice_number: workOrderSiteExpenseTable.invoice_number,
              notes: workOrderSiteExpenseTable.notes,
              documents: workOrderSiteExpenseTable.documents,
              created_by: workOrderSiteExpenseTable.created_by,
              created_at: workOrderSiteExpenseTable.created_at,
              updated_at: workOrderSiteExpenseTable.updated_at,
            })
            .from(workOrderSiteExpenseTable)
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .where(eq(workOrderSiteExpenseTable.work_order_site_id, work_order_site_id))
            .orderBy(desc(workOrderSiteExpenseTable.expense_date), desc(workOrderSiteExpenseTable.created_at))
            .limit(limit)
            .offset(offset);

          const totalPages = Math.ceil(total / limit);
          const hasMore = offset + expenses.length < total;

          return { expenses, pagination: { page, limit, total, totalPages, hasMore } };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching expenses");
        }
      }),
    ),

  getExpenseSummary: protectedProcedure
    .input(z.object({ work_order_site_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

        try {
          const [totalRow] = await ctx.db
            .select({ total: sum(workOrderSiteExpenseTable.amount) })
            .from(workOrderSiteExpenseTable)
            .where(eq(workOrderSiteExpenseTable.work_order_site_id, work_order_site_id));
          const grandTotal = Number(totalRow?.total ?? 0);

          const exceededRows = await ctx.db
            .select({ total: sum(workOrderSiteExpenseTable.amount) })
            .from(workOrderSiteExpenseTable)
            .where(
              and(
                eq(workOrderSiteExpenseTable.work_order_site_id, work_order_site_id),
                ne(workOrderSiteExpenseTable.is_exceeded, 0),
              ),
            );
          const exceededTotal = Number(exceededRows[0]?.total ?? 0);
          const regularTotal = grandTotal - exceededTotal;

          // Only bioremediation completion earns income; restoration tracks
          // its expenses alone.
          const [income] = await ctx.db
            .select({ total: sum(bioremediationContSoilTable.amount) })
            .from(bioremediationContSoilTable)
            .where(
              and(
                eq(bioremediationContSoilTable.work_order_site_id, work_order_site_id),
                eq(bioremediationContSoilTable.type, "completion"),
              ),
            );
          const incomeTotal = Number(income?.total ?? 0);

          const activityRows = await ctx.db
            .select({
              activity_key: workOrderSiteExpenseTable.activity_key,
              expense_date: workOrderSiteExpenseTable.expense_date,
              quantity: workOrderSiteExpenseTable.quantity,
              is_exceeded: workOrderSiteExpenseTable.is_exceeded,
              description: workOrderSiteExpenseTable.description,
              notes: workOrderSiteExpenseTable.notes,
              contractor_id: workOrderSiteExpenseTable.contractor_id,
              invoice_number: workOrderSiteExpenseTable.invoice_number,
              documents: workOrderSiteExpenseTable.documents,
              amount: workOrderSiteExpenseTable.amount,
            })
            .from(workOrderSiteExpenseTable)
            .where(eq(workOrderSiteExpenseTable.work_order_site_id, work_order_site_id));

          const byActivity: Record<string, { totalAmount: number; exceededAmount: number; totalQuantity: number; count: number }> = {};
          const seenForQty = new Set<string>();
          // Totals per contractor id; expenses under none are keyed "none".
          const byContractor: Record<string, number> = {};

          for (const row of activityRows) {
            const contractorKey = row.contractor_id
              ? String(row.contractor_id)
              : "none";
            byContractor[contractorKey] =
              (byContractor[contractorKey] ?? 0) + Number(row.amount || 0);

            if (!row.activity_key) continue;
            if (!byActivity[row.activity_key]) {
              byActivity[row.activity_key] = { totalAmount: 0, exceededAmount: 0, totalQuantity: 0, count: 0 };
            }
            const amt = Number(row.amount || 0);
            byActivity[row.activity_key]!.totalAmount += amt;
            if (row.is_exceeded) byActivity[row.activity_key]!.exceededAmount += amt;
            byActivity[row.activity_key]!.count += 1;

            if (row.quantity) {
              const qtyKey = [
                row.activity_key,
                String(row.expense_date),
                row.quantity,
                String(!!row.is_exceeded),
                row.description ?? "",
                row.notes ?? "",
                String(row.contractor_id ?? ""),
                row.invoice_number ?? "",
                (row.documents ?? []).map((doc) => doc.url).join(","),
              ].join("||");
              if (!seenForQty.has(qtyKey)) {
                seenForQty.add(qtyKey);
                byActivity[row.activity_key]!.totalQuantity += Number(row.quantity || 0);
              }
            }
          }

          return {
            grandTotal,
            regularTotal,
            exceededTotal,
            incomeTotal,
            byActivity,
            byContractor,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching expense summary");
        }
      }),
    ),

  getExpensesByWorkOrder: protectedProcedure
    .input(z.object({ work_order_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrder(ctx.db, scope, input.work_order_id);

        try {
          const expenses = await ctx.db
            .select({
              id: workOrderSiteExpenseTable.id,
              work_order_site_id: workOrderSiteExpenseTable.work_order_site_id,
              site_id: workOrderSiteTable.site_id,
              site_name: siteNameOrRestoration,
              contractor_id: workOrderSiteExpenseTable.contractor_id,
              contractor_name: contractorTable.name,
              activity_key: workOrderSiteExpenseTable.activity_key,
              quantity: workOrderSiteExpenseTable.quantity,
              is_exceeded: workOrderSiteExpenseTable.is_exceeded,
              description: workOrderSiteExpenseTable.description,
              amount: workOrderSiteExpenseTable.amount,
              expense_date: workOrderSiteExpenseTable.expense_date,
              invoice_number: workOrderSiteExpenseTable.invoice_number,
              notes: workOrderSiteExpenseTable.notes,
              documents: workOrderSiteExpenseTable.documents,
              created_at: workOrderSiteExpenseTable.created_at,
            })
            .from(workOrderSiteExpenseTable)
            .innerJoin(
              workOrderSiteTable,
              eq(
                workOrderSiteExpenseTable.work_order_site_id,
                workOrderSiteTable.id,
              ),
            )
            .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .where(eq(workOrderSiteTable.work_order_id, input.work_order_id))
            .orderBy(desc(workOrderSiteExpenseTable.expense_date));

          return { expenses };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching work order expenses");
        }
      }),
    ),
});

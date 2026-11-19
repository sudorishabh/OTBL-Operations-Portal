import {
  eq,
  sum,
  desc,
  asc,
  and,
  or,
  ne,
  gte,
  lt,
  like,
  isNull,
  count,
  type SQL,
} from "drizzle-orm";
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
import { escapeLike } from "../../helper/escape-like";
import { z } from "zod";

const {
  workOrderSiteExpenseTable,
  contractorTable,
  userTable,
  workOrderSiteTable,
  siteTable,
  bioremediationContSoilTable,
  jobOrderTable,
  contractOrderTable,
  contractOrderItemTable,
} = schema;

const dayValidator = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// How a site's expenses are narrowed; each filter is optional.
const expenseFilters = {
  // Matches the title, invoice number or vendor.
  search: z.string().trim().max(100).optional(),
  // A vendor's id, or "none" for those under no vendor.
  vendor: z.union([z.number().int().positive(), z.literal("none")]).optional(),
  // The first and last day, YYYY-MM-DD, an expense may start on.
  from: dayValidator.optional(),
  to: dayValidator.optional(),
  // An activity's key, or "none" for those on no activity.
  activity: z.string().trim().min(1).max(100).optional(),
  // Only those over the estimate.
  exceeded_only: z.boolean().optional(),
};
type ExpenseFilters = {
  [K in keyof typeof expenseFilters]?: z.infer<(typeof expenseFilters)[K]>;
};

const EXPENSE_SORTS = ["newest", "oldest", "amount_desc", "amount_asc"] as const;

// A day's midnight in the server's time zone, as expense dates are kept.
const startOfDay = (day: string) => new Date(`${day}T00:00:00`);
const dayAfter = (day: string) => {
  const date = startOfDay(day);
  date.setDate(date.getDate() + 1);
  return date;
};

// A site's expenses, narrowed by the filters. Reads the vendor's name, so the
// query must join contractorTable.
const expenseWhere = (workOrderSiteId: number, filters: ExpenseFilters) => {
  const e = workOrderSiteExpenseTable;
  const conditions: (SQL | undefined)[] = [eq(e.work_order_site_id, workOrderSiteId)];

  if (filters.search) {
    const term = `%${escapeLike(filters.search)}%`;
    conditions.push(
      or(like(e.title, term), like(e.invoice_number, term), like(contractorTable.name, term)),
    );
  }
  if (filters.vendor === "none") conditions.push(isNull(e.contractor_id));
  else if (filters.vendor) conditions.push(eq(e.contractor_id, filters.vendor));
  if (filters.from) conditions.push(gte(e.start_date, startOfDay(filters.from)));
  if (filters.to) conditions.push(lt(e.start_date, dayAfter(filters.to)));
  if (filters.activity === "none") conditions.push(isNull(e.activity_key));
  else if (filters.activity) conditions.push(eq(e.activity_key, filters.activity));
  if (filters.exceeded_only) conditions.push(ne(e.is_exceeded, 0));

  return and(...conditions);
};

const expenseOrder = (sort: (typeof EXPENSE_SORTS)[number]) => {
  const e = workOrderSiteExpenseTable;
  switch (sort) {
    case "oldest":
      return [asc(e.start_date), asc(e.created_at), asc(e.id)];
    case "amount_desc":
      return [desc(e.amount), desc(e.start_date), desc(e.id)];
    case "amount_asc":
      return [asc(e.amount), desc(e.start_date), desc(e.id)];
    default:
      return [desc(e.start_date), desc(e.created_at), desc(e.id)];
  }
};

// The month a date falls in, as "2026-04", in the server's time zone.
const monthOf = (value: Date | string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export const expenseQueryRouter = router({
  getExpenses: protectedProcedure
    .input(z.object({
      work_order_site_id: z.number().positive(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
      ...expenseFilters,
      // Newest first unless asked otherwise.
      sort: z.enum(EXPENSE_SORTS).default("newest"),
    }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id, page, limit, sort, ...filters } = input;
        const where = expenseWhere(work_order_site_id, filters);
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
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .where(where);

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
              contract_order_item_id:
                workOrderSiteExpenseTable.contract_order_item_id,
              // Recorded by its purchase order, so changed only there.
              from_order: workOrderSiteExpenseTable.from_order,
              job_order_id: workOrderSiteExpenseTable.job_order_id,
              activity_key: workOrderSiteExpenseTable.activity_key,
              quantity: workOrderSiteExpenseTable.quantity,
              is_exceeded: workOrderSiteExpenseTable.is_exceeded,
              title: workOrderSiteExpenseTable.title,
              amount: workOrderSiteExpenseTable.amount,
              start_date: workOrderSiteExpenseTable.start_date,
              end_date: workOrderSiteExpenseTable.end_date,
              invoice_number: workOrderSiteExpenseTable.invoice_number,
              documents: workOrderSiteExpenseTable.documents,
              created_by: workOrderSiteExpenseTable.created_by,
              created_by_name: userTable.name,
              created_at: workOrderSiteExpenseTable.created_at,
              updated_at: workOrderSiteExpenseTable.updated_at,
            })
            .from(workOrderSiteExpenseTable)
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .leftJoin(userTable, eq(workOrderSiteExpenseTable.created_by, userTable.id))
            .where(where)
            .orderBy(...expenseOrder(sort))
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

  // Every expense at a site, newest first, with the month it starts in and
  // what it was spent on: its vendor, its job order under restoration, or its
  // purchase order or sub-contract under bioremediation. Light enough to send
  // whole, so the monthly view filters and totals them as the user picks.
  getVendorMonthlyExpenses: protectedProcedure
    .input(z.object({ work_order_site_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrderSite(
          ctx.db,
          scope,
          input.work_order_site_id,
        );

        try {
          const rows = await ctx.db
            .select({
              id: workOrderSiteExpenseTable.id,
              title: workOrderSiteExpenseTable.title,
              amount: workOrderSiteExpenseTable.amount,
              start_date: workOrderSiteExpenseTable.start_date,
              end_date: workOrderSiteExpenseTable.end_date,
              invoice_number: workOrderSiteExpenseTable.invoice_number,
              activity_key: workOrderSiteExpenseTable.activity_key,
              from_order: workOrderSiteExpenseTable.from_order,
              is_exceeded: workOrderSiteExpenseTable.is_exceeded,
              vendor_id: workOrderSiteExpenseTable.contractor_id,
              vendor_name: contractorTable.name,
              job_order_id: workOrderSiteExpenseTable.job_order_id,
              jo_number: jobOrderTable.jo_number,
              order_id: contractOrderTable.id,
              order_code: contractOrderTable.code,
              order_type: contractOrderTable.type,
            })
            .from(workOrderSiteExpenseTable)
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .leftJoin(
              jobOrderTable,
              eq(workOrderSiteExpenseTable.job_order_id, jobOrderTable.id),
            )
            .leftJoin(
              contractOrderItemTable,
              eq(
                workOrderSiteExpenseTable.contract_order_item_id,
                contractOrderItemTable.id,
              ),
            )
            .leftJoin(
              contractOrderTable,
              eq(contractOrderItemTable.contract_order_id, contractOrderTable.id),
            )
            .where(
              eq(
                workOrderSiteExpenseTable.work_order_site_id,
                input.work_order_site_id,
              ),
            )
            .orderBy(
              desc(workOrderSiteExpenseTable.start_date),
              desc(workOrderSiteExpenseTable.id),
            );

          return rows.map((row) => ({
            ...row,
            month: monthOf(row.start_date),
            amount: Number(row.amount || 0),
            from_order: !!row.from_order,
            is_exceeded: !!row.is_exceeded,
          }));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching monthly expenses");
        }
      }),
    ),

  // A site's expense totals, of those the filters leave when given.
  getExpenseSummary: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        ...expenseFilters,
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id, ...filters } = input;
        const where = expenseWhere(work_order_site_id, filters);

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
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .where(where);
          const grandTotal = Number(totalRow?.total ?? 0);

          const exceededRows = await ctx.db
            .select({ total: sum(workOrderSiteExpenseTable.amount) })
            .from(workOrderSiteExpenseTable)
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .where(and(where, ne(workOrderSiteExpenseTable.is_exceeded, 0)));
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
              quantity: workOrderSiteExpenseTable.quantity,
              is_exceeded: workOrderSiteExpenseTable.is_exceeded,
              contractor_id: workOrderSiteExpenseTable.contractor_id,
              contract_order_item_id:
                workOrderSiteExpenseTable.contract_order_item_id,
              job_order_id: workOrderSiteExpenseTable.job_order_id,
              amount: workOrderSiteExpenseTable.amount,
            })
            .from(workOrderSiteExpenseTable)
            .leftJoin(
              contractorTable,
              eq(workOrderSiteExpenseTable.contractor_id, contractorTable.id),
            )
            .where(where);

          const byActivity: Record<string, { totalAmount: number; exceededAmount: number; totalQuantity: number; count: number }> = {};
          // Totals per contractor id; expenses under none are keyed "none".
          const byContractor: Record<string, number> = {};
          // Totals per contract order item id, and per "itemId:contractorId"
          // for each vendor under it.
          const byOrderItem: Record<string, number> = {};
          const byOrderItemVendor: Record<string, number> = {};
          // The same for restoration job orders.
          const byJobOrder: Record<string, number> = {};
          const byJobOrderVendor: Record<string, number> = {};

          for (const row of activityRows) {
            const contractorKey = row.contractor_id
              ? String(row.contractor_id)
              : "none";
            byContractor[contractorKey] =
              (byContractor[contractorKey] ?? 0) + Number(row.amount || 0);

            if (row.contract_order_item_id) {
              const itemKey = String(row.contract_order_item_id);
              const vendorKey = `${itemKey}:${contractorKey}`;
              byOrderItem[itemKey] =
                (byOrderItem[itemKey] ?? 0) + Number(row.amount || 0);
              byOrderItemVendor[vendorKey] =
                (byOrderItemVendor[vendorKey] ?? 0) + Number(row.amount || 0);
            }
            if (row.job_order_id) {
              const jobKey = String(row.job_order_id);
              const vendorKey = `${jobKey}:${contractorKey}`;
              byJobOrder[jobKey] =
                (byJobOrder[jobKey] ?? 0) + Number(row.amount || 0);
              byJobOrderVendor[vendorKey] =
                (byJobOrderVendor[vendorKey] ?? 0) + Number(row.amount || 0);
            }

            if (!row.activity_key) continue;
            if (!byActivity[row.activity_key]) {
              byActivity[row.activity_key] = { totalAmount: 0, exceededAmount: 0, totalQuantity: 0, count: 0 };
            }
            const amt = Number(row.amount || 0);
            byActivity[row.activity_key]!.totalAmount += amt;
            if (row.is_exceeded) byActivity[row.activity_key]!.exceededAmount += amt;
            byActivity[row.activity_key]!.count += 1;
            // Each expense's quantity is used up from its activity.
            byActivity[row.activity_key]!.totalQuantity += Number(row.quantity || 0);
          }

          return {
            grandTotal,
            regularTotal,
            exceededTotal,
            incomeTotal,
            byActivity,
            byContractor,
            byOrderItem,
            byOrderItemVendor,
            byJobOrder,
            byJobOrderVendor,
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
              title: workOrderSiteExpenseTable.title,
              amount: workOrderSiteExpenseTable.amount,
              start_date: workOrderSiteExpenseTable.start_date,
              end_date: workOrderSiteExpenseTable.end_date,
              invoice_number: workOrderSiteExpenseTable.invoice_number,
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
            .orderBy(desc(workOrderSiteExpenseTable.start_date));

          return { expenses };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching work order expenses");
        }
      }),
    ),
});

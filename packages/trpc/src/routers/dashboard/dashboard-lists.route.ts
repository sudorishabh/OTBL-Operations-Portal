import { and, asc, count, eq, gte, like, or, sum } from "drizzle-orm";
import { z } from "zod";
import { schema } from "@pkg/db";
import { protectedProcedure } from "../../core";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { buildPagination, pageOffset } from "../../helper/pagination";
import {
  exceededAmount,
  expenseMonth,
  withExpensePlaces,
} from "../contractor/vendor-expenses";
import {
  deadlineWhere,
  e,
  ENDING_SOON_DAYS,
  expenseFilterWhere,
  expenseFilters,
  pageInput,
  trendMonths,
  visibleWorkOrders,
  wo,
  workOrderFilterWhere,
  workOrderFilters,
} from "./dashboard-conditions";

const { clientTable, officeTable } = schema;

// What the overview's dialogs show beyond its cards: longer and narrower
// views of the same figures. Spread into the dashboard router.

// How many months an expense trend can cover.
const TREND_LENGTHS = [6, 12, 24, 36] as const;

export const dashboardListProcedures = {
  // What was spent in each of the last few months, with how much of it went
  // over the estimates and how many expenses it was; narrowed to an office,
  // a process and what it was spent through.
  getExpenseTrend: protectedProcedure
    .input(
      z.object({
        months: z
          .number()
          .int()
          .refine((value) =>
            (TREND_LENGTHS as readonly number[]).includes(value),
          )
          .default(12),
        office_id: expenseFilters.office_id,
        process: expenseFilters.process,
        source: expenseFilters.source,
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const visible = and(
          await visibleWorkOrders(ctx),
          expenseFilterWhere(input, { withDates: false }),
        );
        const months = trendMonths(input.months);
        const start = new Date(`${months[0]}-01T00:00:00`);

        try {
          const rows = await withExpensePlaces(
            ctx.db
              .select({
                month: expenseMonth,
                total: sum(e.amount),
                exceeded: exceededAmount,
                count: count(),
              })
              .from(e)
              .$dynamic(),
          )
            .where(and(visible, gte(e.start_date, start)))
            .groupBy(expenseMonth);

          // Every month of the trend, oldest first, those with none at 0.
          const byMonth = new Map(rows.map((row) => [row.month, row]));
          const trend = months.map((month) => {
            const row = byMonth.get(month);
            return {
              month,
              total: Number(row?.total ?? 0),
              exceeded: Number(row?.exceeded ?? 0),
              count: Number(row?.count ?? 0),
            };
          });

          return {
            months: trend,
            total: trend.reduce((all, month) => all + month.total, 0),
            exceeded: trend.reduce((all, month) => all + month.exceeded, 0),
            count: trend.reduce((all, month) => all + month.count, 0),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching the expense trend");
        }
      }),
    ),

  // A page of the pending work orders past their end date, or ending within
  // the next few days, those ending first first. Narrowed by the work order
  // filters and a search of their codes, client and office.
  getDeadlines: protectedProcedure
    .input(
      z.object({
        kind: z.enum(["overdue", "ending"]),
        days: z.number().int().min(1).max(365).default(ENDING_SOON_DAYS),
        search: z.string().trim().max(100).optional(),
        ...workOrderFilters,
        ...pageInput(10),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const term = input.search ? `%${escapeLike(input.search)}%` : null;
        const where = and(
          await visibleWorkOrders(ctx),
          workOrderFilterWhere(input),
          deadlineWhere(input.kind, input.days),
          term
            ? or(
                like(wo.code, term),
                like(wo.purchase_order_code, term),
                like(clientTable.name, term),
                like(officeTable.name, term),
              )
            : undefined,
        );

        try {
          const [[total], rows] = await Promise.all([
            ctx.db
              .select({ count: count() })
              .from(wo)
              .leftJoin(clientTable, eq(wo.client_id, clientTable.id))
              .leftJoin(officeTable, eq(wo.office_id, officeTable.id))
              .where(where),
            ctx.db
              .select({
                id: wo.id,
                code: wo.code,
                purchase_order_code: wo.purchase_order_code,
                process_type: wo.process_type,
                client_name: clientTable.name,
                office_name: officeTable.name,
                start_date: wo.start_date,
                end_date: wo.end_date,
              })
              .from(wo)
              .leftJoin(clientTable, eq(wo.client_id, clientTable.id))
              .leftJoin(officeTable, eq(wo.office_id, officeTable.id))
              .where(where)
              .orderBy(asc(wo.end_date), asc(wo.id))
              .limit(input.limit)
              .offset(pageOffset(input.page, input.limit)),
          ]);

          return {
            workOrders: rows,
            pagination: buildPagination({
              page: input.page,
              limit: input.limit,
              total: Number(total?.count ?? 0),
              shown: rows.length,
            }),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Listing work orders by deadline");
        }
      }),
    ),
};

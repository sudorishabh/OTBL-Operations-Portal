import { and, count, gte, sum } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../../core";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import {
  exceededAmount,
  expenseMonth,
  withExpensePlaces,
} from "../contractor/vendor-expenses";
import {
  e,
  expenseFilterWhere,
  expenseFilters,
  trendMonths,
  visibleWorkOrders,
} from "./dashboard-conditions";

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
};

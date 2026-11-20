import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  isNull,
  ne,
  sql,
  sum,
} from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { getAccessScope, workOrderScopeWhere } from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { sorFullyConsumedSql } from "../work-order/batch-effective-work-order-status";
import { canUseVendors } from "../contractor/vendor-access";
import {
  EXPENSE_SOURCES,
  exceededAmount,
  expenseMonth,
  expenseSource,
  withExpensePlaces,
} from "../contractor/vendor-expenses";
import type { TrpcContext } from "../../context";

// The overview's figures, each limited to what the user can see.

const {
  workOrderTable,
  workOrderSiteTable,
  scheduleOfRatesTable,
  workOrderSiteExpenseTable,
  contractorTable,
} = schema;
const { WORK_ORDER_STATUS } = constants;

const wo = workOrderTable;
const wos = workOrderSiteTable;
const e = workOrderSiteExpenseTable;

// How many months the expense trend covers, this one included.
const TREND_MONTHS = 12;

// How many of the vendors most was spent with are listed.
const TOP_VENDORS = 5;

// A month as "2026-04", as expenseMonth gives it.
const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

// The last TREND_MONTHS months, oldest first, in the server's time zone.
const trendMonths = (now = new Date()) =>
  Array.from({ length: TREND_MONTHS }, (_, index) =>
    monthKey(
      new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1 - index)),
    ),
  );

// Work orders by status, as the work order list counts them.
export type WorkOrderStatusCounts = {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
};

const noWorkOrders = (): WorkOrderStatusCounts => ({
  total: 0,
  pending: 0,
  completed: 0,
  cancelled: 0,
});

// Done and still open, of a kind of work order site.
type SiteProgress = { total: number; completed: number };

// The work orders the user can see, as a condition on workOrderTable.
export const visibleWorkOrders = async (ctx: TrpcContext) =>
  workOrderScopeWhere(
    await getAccessScope(ctx.db, Number(ctx.user!.sub), ctx.user!.role),
  );

// Work orders that are not cancelled; their sites and rates still count.
const notCancelled = ne(wo.status, WORK_ORDER_STATUS.CANCELLED);

export const dashboardQueryRouter = router({
  // The visible work orders by status, overall and by process; how far their
  // sites and restorations have got; and what their schedules of rates are
  // worth. A pending work order whose schedule of rates is used up counts as
  // completed, as it does in the work order list.
  getWorkOrderSummary: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const visible = await visibleWorkOrders(ctx);

      try {
        const [statusRows, siteRows, [rates]] = await Promise.all([
          ctx.db
            .select({
              process_type: wo.process_type,
              status: wo.status,
              count: count(),
              used_up: sql<string>`sum(case when ${sorFullyConsumedSql()} then 1 else 0 end)`,
            })
            .from(wo)
            .where(visible)
            .groupBy(wo.process_type, wo.status),
          ctx.db
            .select({
              is_restoration: sql<number>`${isNull(wos.site_id)}`,
              is_completed: wos.is_completed,
              count: count(),
            })
            .from(wos)
            .innerJoin(wo, eq(wos.work_order_id, wo.id))
            .where(and(visible, notCancelled))
            .groupBy(isNull(wos.site_id), wos.is_completed),
          ctx.db
            .select({ total: sum(scheduleOfRatesTable.total_cost) })
            .from(scheduleOfRatesTable)
            .innerJoin(wo, eq(scheduleOfRatesTable.work_order_id, wo.id))
            .where(and(visible, notCancelled)),
        ]);

        const overall = noWorkOrders();
        const byProcess: Record<string, WorkOrderStatusCounts> = {};

        for (const row of statusRows) {
          const rowCount = Number(row.count);
          const usedUp =
            row.status === WORK_ORDER_STATUS.PENDING ? Number(row.used_up) : 0;
          const process = (byProcess[row.process_type] ??= noWorkOrders());

          for (const counts of [overall, process]) {
            counts.total += rowCount;
            if (row.status === WORK_ORDER_STATUS.PENDING) {
              counts.pending += rowCount - usedUp;
              counts.completed += usedUp;
            } else if (row.status === WORK_ORDER_STATUS.COMPLETED) {
              counts.completed += rowCount;
            } else if (row.status === WORK_ORDER_STATUS.CANCELLED) {
              counts.cancelled += rowCount;
            }
          }
        }

        const sites: SiteProgress = { total: 0, completed: 0 };
        const restorations: SiteProgress = { total: 0, completed: 0 };
        for (const row of siteRows) {
          const progress = Number(row.is_restoration) ? restorations : sites;
          progress.total += Number(row.count);
          if (row.is_completed) progress.completed += Number(row.count);
        }

        return {
          ...overall,
          byProcess,
          sites,
          restorations,
          // What the schedules of rates of work orders not cancelled add up
          // to: the income they are worth.
          sorTotal: Number(rates?.total ?? 0),
        };
      } catch (error) {
        throw fromDatabaseError(error, "Summarising work orders");
      }
    }),
  ),

  // What has been spent across the visible work orders: in all, over the
  // estimate, month by month for the last year, by what it was spent on and
  // by process, and with the vendors most was spent with. Vendors are left
  // out for users who can't see them.
  getFinanceSummary: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const [visible, showVendors] = await Promise.all([
        visibleWorkOrders(ctx),
        canUseVendors(ctx),
      ]);
      const months = trendMonths();
      const trendStart = new Date(`${months[0]}-01T00:00:00`);
      const spent = sum(e.amount);

      try {
        const [[totals], monthRows, sourceRows, processRows, vendorRows] =
          await Promise.all([
            withExpensePlaces(
              ctx.db
                .select({
                  total: spent,
                  exceeded: exceededAmount,
                  count: count(),
                  vendor_count: countDistinct(e.contractor_id),
                })
                .from(e)
                .$dynamic(),
            ).where(visible),
            withExpensePlaces(
              ctx.db
                .select({ month: expenseMonth, total: spent })
                .from(e)
                .$dynamic(),
            )
              .where(and(visible, gte(e.start_date, trendStart)))
              .groupBy(expenseMonth),
            withExpensePlaces(
              ctx.db
                .select({ source: expenseSource, total: spent, count: count() })
                .from(e)
                .$dynamic(),
            )
              .where(visible)
              .groupBy(expenseSource),
            withExpensePlaces(
              ctx.db
                .select({ process_type: wos.process_type, total: spent })
                .from(e)
                .$dynamic(),
            )
              .where(visible)
              .groupBy(wos.process_type),
            showVendors
              ? withExpensePlaces(
                  ctx.db
                    .select({
                      id: contractorTable.id,
                      code: contractorTable.code,
                      name: contractorTable.name,
                      total: spent,
                      count: count(),
                    })
                    .from(e)
                    .$dynamic(),
                )
                  .innerJoin(
                    contractorTable,
                    eq(e.contractor_id, contractorTable.id),
                  )
                  .where(visible)
                  .groupBy(contractorTable.id)
                  .orderBy(desc(spent), desc(contractorTable.id))
                  .limit(TOP_VENDORS)
              : Promise.resolve(null),
          ]);

        const totalOf = (month: string | undefined) =>
          Number(monthRows.find((row) => row.month === month)?.total ?? 0);

        const byProcess: Record<string, number> = {};
        for (const row of processRows) {
          byProcess[row.process_type] = Number(row.total ?? 0);
        }

        return {
          spent: Number(totals?.total ?? 0),
          exceeded: Number(totals?.exceeded ?? 0),
          count: Number(totals?.count ?? 0),
          // How many vendors anything was spent with.
          vendorCount: Number(totals?.vendor_count ?? 0),
          thisMonth: totalOf(months[TREND_MONTHS - 1]),
          lastMonth: totalOf(months[TREND_MONTHS - 2]),
          // Every month of the trend, oldest first, those with none at 0.
          months: months.map((month) => ({ month, total: totalOf(month) })),
          // Every kind, in a fixed order, those with none at 0.
          sources: EXPENSE_SOURCES.map((source) => {
            const row = sourceRows.find((r) => r.source === source);
            return {
              source,
              total: Number(row?.total ?? 0),
              count: Number(row?.count ?? 0),
            };
          }),
          byProcess,
          // Most spent first; null when the user can't see vendors.
          topVendors:
            vendorRows?.map((row) => ({
              ...row,
              total: Number(row.total ?? 0),
              count: Number(row.count),
            })) ?? null,
        };
      } catch (error) {
        throw fromDatabaseError(error, "Summarising expenses");
      }
    }),
  ),
});

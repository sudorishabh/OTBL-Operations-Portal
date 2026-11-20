import { and, count, eq, isNull, ne, sql, sum } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { getAccessScope, workOrderScopeWhere } from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { sorFullyConsumedSql } from "../work-order/batch-effective-work-order-status";
import type { TrpcContext } from "../../context";

// The overview's figures, each limited to what the user can see.

const { workOrderTable, workOrderSiteTable, scheduleOfRatesTable } = schema;
const { WORK_ORDER_STATUS } = constants;

const wo = workOrderTable;
const wos = workOrderSiteTable;

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
});

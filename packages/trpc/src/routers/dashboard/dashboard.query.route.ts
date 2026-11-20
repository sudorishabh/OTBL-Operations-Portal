import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  isNull,
  lt,
  ne,
  not,
  sql,
  sum,
  type SQL,
  type SQLWrapper,
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
  clientTable,
  officeTable,
  jobOrderTable,
  contractOrderTable,
} = schema;
const { WORK_ORDER_STATUS } = constants;

const wo = workOrderTable;
const wos = workOrderSiteTable;
const e = workOrderSiteExpenseTable;

// How many months the expense trend covers, this one included.
const TREND_MONTHS = 12;

// How many of the vendors most was spent with are listed.
const TOP_VENDORS = 5;

// How far ahead a pending work order's end date counts as coming up.
const ENDING_SOON_DAYS = 30;

// How many overdue and ending work orders are listed of each.
const DEADLINE_ROWS = 5;

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

// Work orders still pending, as the work order list counts them: not those
// whose schedule of rates is used up.
const stillPending = () =>
  and(eq(wo.status, WORK_ORDER_STATUS.PENDING), not(sorFullyConsumedSql()));

// Whether a record's list of uploaded documents has any in it.
const hasDocuments = (column: SQLWrapper) =>
  sql`coalesce(json_length(${column}), 0) > 0`;

// How many rows meet a condition, inside a grouped or totalled query.
const countWhere = (condition: SQL) =>
  sql<string>`sum(case when ${condition} then 1 else 0 end)`;

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

  // What needs following up across the visible work orders that are not
  // cancelled: pending work orders past their end date or ending soon, job
  // orders still to be certified or invoiced, and contract orders whose
  // completion documents are still to come.
  getAttention: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const visible = await visibleWorkOrders(ctx);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const soon = new Date(today);
      soon.setDate(soon.getDate() + ENDING_SOON_DAYS + 1);

      const overdue = and(visible, stillPending(), lt(wo.end_date, today));
      const endingSoon = and(
        visible,
        stillPending(),
        gte(wo.end_date, today),
        lt(wo.end_date, soon),
      );

      // A few of the work orders a condition matches, those ending first
      // first.
      const deadlineRows = (where: SQL | undefined) =>
        ctx.db
          .select({
            id: wo.id,
            code: wo.code,
            purchase_order_code: wo.purchase_order_code,
            client_name: clientTable.name,
            office_name: officeTable.name,
            end_date: wo.end_date,
          })
          .from(wo)
          .leftJoin(clientTable, eq(wo.client_id, clientTable.id))
          .leftJoin(officeTable, eq(wo.office_id, officeTable.id))
          .where(where)
          .orderBy(asc(wo.end_date), asc(wo.id))
          .limit(DEADLINE_ROWS);

      const jo = jobOrderTable;
      const certified = hasDocuments(jo.documents);
      const co = contractOrderTable;

      try {
        const [
          [overdueCount],
          overdueRows,
          [endingSoonCount],
          endingSoonRows,
          [jobOrders],
          orderRows,
        ] = await Promise.all([
          ctx.db.select({ count: count() }).from(wo).where(overdue),
          deadlineRows(overdue),
          ctx.db.select({ count: count() }).from(wo).where(endingSoon),
          deadlineRows(endingSoon),
          ctx.db
            .select({
              total: count(),
              closed: countWhere(certified),
              // Its work done saved, its certificate still to come.
              work_done: countWhere(
                sql`not ${certified} and ${jo.completion_activities} is not null`,
              ),
              not_invoiced: countWhere(
                sql`${certified} and not ${hasDocuments(jo.invoices)}`,
              ),
            })
            .from(jo)
            .innerJoin(wos, eq(jo.work_order_site_id, wos.id))
            .innerJoin(wo, eq(wos.work_order_id, wo.id))
            .where(and(visible, notCancelled)),
          ctx.db
            .select({
              type: co.type,
              total: count(),
              completed: countWhere(hasDocuments(co.completion_documents)),
            })
            .from(co)
            .innerJoin(wo, eq(co.work_order_id, wo.id))
            .where(and(visible, notCancelled))
            .groupBy(co.type),
        ]);

        const jobOrderTotal = Number(jobOrders?.total ?? 0);
        const closed = Number(jobOrders?.closed ?? 0);
        const workDone = Number(jobOrders?.work_done ?? 0);

        return {
          overdue: {
            count: Number(overdueCount?.count ?? 0),
            workOrders: overdueRows,
          },
          endingSoon: {
            days: ENDING_SOON_DAYS,
            count: Number(endingSoonCount?.count ?? 0),
            workOrders: endingSoonRows,
          },
          jobOrders: {
            total: jobOrderTotal,
            open: jobOrderTotal - closed - workDone,
            awaitingCertificate: workDone,
            closed,
            awaitingInvoice: Number(jobOrders?.not_invoiced ?? 0),
          },
          // Each kind of contract order, with those completed.
          contractOrders: Object.fromEntries(
            orderRows.map((row) => [
              row.type,
              { total: Number(row.total), completed: Number(row.completed) },
            ]),
          ) as Record<string, { total: number; completed: number }>,
        };
      } catch (error) {
        throw fromDatabaseError(error, "Finding work that needs attention");
      }
    }),
  ),
});

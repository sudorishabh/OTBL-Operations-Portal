import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  clientIdsVisibleToScope,
  getAccessScope,
  parentClientIdsOfClients,
  proposalIdsVisibleToScope,
} from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { buildPagination, pageOffset } from "../../helper/pagination";
import { sorFullyConsumedSql } from "../work-order/batch-effective-work-order-status";
import { canUseVendors } from "../contractor/vendor-access";
import {
  EXPENSE_SOURCES,
  exceededAmount,
  expenseMonth,
  expenseSource,
  withExpensePlaces,
} from "../contractor/vendor-expenses";
import {
  countWhere,
  deadlineWhere,
  ENDING_SOON_DAYS,
  e,
  hasDocuments,
  stillPending,
  visibleWorkOrders,
  wo,
  expenseFilterWhere,
  expenseFilters,
  pageInput,
  trendMonths,
  workOrderFilterWhere,
  workOrderFilters,
  wos,
} from "./dashboard-conditions";
import { dashboardListProcedures } from "./dashboard-lists.route";

// The overview's figures, each limited to what the user can see.

const {
  scheduleOfRatesTable,
  contractorTable,
  clientTable,
  officeTable,
  jobOrderTable,
  contractOrderTable,
  proposalTable,
  parentClientTable,
  siteTable,
  userTable,
} = schema;
const { PROPOSAL_STATUS, ROLES, WORK_ORDER_STATUS } = constants;

// How many months the expense trend covers, this one included.
const TREND_MONTHS = 12;

// How many of the vendors most was spent with are listed.
const TOP_VENDORS = 5;

// How many overdue and ending work orders are listed of each.
const DEADLINE_ROWS = 5;

// How many of the offices with the most pending work are listed.
const TOP_OFFICES = 6;

// What the office breakdown can be sorted by, each most first but the name.
const OFFICE_SORTS = ["pending", "total", "spent", "name"] as const;

// Work orders by status, as the work order list counts them.
export type WorkOrderStatusCounts = {
  total: number;
  pending: number;
  completed: number;
};

const noWorkOrders = (): WorkOrderStatusCounts => ({
  total: 0,
  pending: 0,
  completed: 0,
});

// Done and still open, of a kind of work order site.
type SiteProgress = { total: number; completed: number };

export const dashboardQueryRouter = router({
  ...dashboardListProcedures,

  // The visible work orders by status, overall, by process and by financial
  // year; how far their sites and restorations have got; and what their
  // schedules of rates are worth. A pending work order whose schedule of
  // rates is used up counts as completed, as it does in the work order list.
  // The filters narrow every figure.
  getWorkOrderSummary: protectedProcedure
    .input(z.object(workOrderFilters).optional())
    .query(
      handleQuery(async ({ input, ctx }) => {
        const visible = and(
          await visibleWorkOrders(ctx),
          workOrderFilterWhere(input),
        );

        try {
          const [statusRows, siteRows, [rates]] = await Promise.all([
            ctx.db
              .select({
                process_type: wo.process_type,
                financial_year: wo.financial_year,
                status: wo.status,
                count: count(),
                used_up: countWhere(sorFullyConsumedSql()),
              })
              .from(wo)
              .where(visible)
              .groupBy(wo.process_type, wo.financial_year, wo.status),
            ctx.db
              .select({
                is_restoration: sql<number>`${isNull(wos.site_id)}`,
                is_completed: wos.is_completed,
                count: count(),
              })
              .from(wos)
              .innerJoin(wo, eq(wos.work_order_id, wo.id))
              .where(visible)
              .groupBy(isNull(wos.site_id), wos.is_completed),
            ctx.db
              .select({ total: sum(scheduleOfRatesTable.total_cost) })
              .from(scheduleOfRatesTable)
              .innerJoin(wo, eq(scheduleOfRatesTable.work_order_id, wo.id))
              .where(visible),
          ]);

          const overall = noWorkOrders();
          const byProcess: Record<string, WorkOrderStatusCounts> = {};
          const byYear: Record<string, WorkOrderStatusCounts> = {};

          for (const row of statusRows) {
            const rowCount = Number(row.count);
            const usedUp =
              row.status === WORK_ORDER_STATUS.PENDING
                ? Number(row.used_up)
                : 0;
            const process = (byProcess[row.process_type] ??= noWorkOrders());
            const year = (byYear[row.financial_year] ??= noWorkOrders());

            for (const counts of [overall, process, year]) {
              counts.total += rowCount;
              if (row.status === WORK_ORDER_STATUS.PENDING) {
                counts.pending += rowCount - usedUp;
                counts.completed += usedUp;
              } else if (row.status === WORK_ORDER_STATUS.COMPLETED) {
                counts.completed += rowCount;
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
            // Newest financial year first.
            byFinancialYear: Object.entries(byYear)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([financial_year, counts]) => ({
                financial_year,
                ...counts,
              })),
            sites,
            restorations,
            // What the work orders' schedules of rates add up to: the
            // income they are worth.
            sorTotal: Number(rates?.total ?? 0),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Summarising work orders");
        }
      }),
    ),

  // What the dialogs' filters offer: the financial years the visible work
  // orders start in, newest first.
  getFilterOptions: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const visible = await visibleWorkOrders(ctx);
      try {
        const years = await ctx.db
          .selectDistinct({ financial_year: wo.financial_year })
          .from(wo)
          .where(visible)
          .orderBy(desc(wo.financial_year));
        return { financialYears: years.map((row) => row.financial_year) };
      } catch (error) {
        throw fromDatabaseError(error, "Listing filter options");
      }
    }),
  ),

  // What has been spent across the visible work orders: in all, over the
  // estimate, month by month for the last year, by what it was spent on and
  // by process, and with the vendors most was spent with. Vendors are left
  // out for users who can't see them. The filters narrow every figure; the
  // days picked leave the monthly trend alone.
  getFinanceSummary: protectedProcedure
    .input(z.object(expenseFilters).optional())
    .query(
      handleQuery(async ({ input, ctx }) => {
        const [scope, showVendors] = await Promise.all([
          visibleWorkOrders(ctx),
          canUseVendors(ctx),
        ]);
        // The trend keeps its own months, whatever days are picked.
        const visible = and(scope, expenseFilterWhere(input));
        const anyDay = and(
          scope,
          expenseFilterWhere(input, { withDates: false }),
        );
        const months = trendMonths(TREND_MONTHS);
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
                .where(and(anyDay, gte(e.start_date, trendStart)))
                .groupBy(expenseMonth),
              withExpensePlaces(
                ctx.db
                  .select({
                    source: expenseSource,
                    total: spent,
                    count: count(),
                  })
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

  // What needs following up across the visible work orders: pending work
  // orders past their end date or ending soon, job orders still to be
  // certified or invoiced, and contract orders whose completion documents
  // are still to come. The filters narrow all of it.
  getAttention: protectedProcedure
    .input(
      z
        .object({
          ...workOrderFilters,
          // How far ahead counts as ending soon.
          days: z.number().int().min(1).max(365).optional(),
        })
        .optional(),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const visible = and(
          await visibleWorkOrders(ctx),
          workOrderFilterWhere(input),
        );
        const days = input?.days ?? ENDING_SOON_DAYS;

        const overdue = and(visible, deadlineWhere("overdue", days));
        const endingSoon = and(visible, deadlineWhere("ending", days));

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
              .where(visible),
            ctx.db
              .select({
                type: co.type,
                total: count(),
                completed: countWhere(hasDocuments(co.completion_documents)),
              })
              .from(co)
              .innerJoin(wo, eq(co.work_order_id, wo.id))
              .where(visible)
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
              days,
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

  // How many records each module holds that the user can see: proposals by
  // status and main clients; vendors, for those who can see them; and users
  // by role, for admins.
  getModuleCounts: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role,
      );
      const isAdmin = ctx.user!.role === ROLES.ADMIN;

      try {
        const [proposalIds, clientIds, showVendors] = await Promise.all([
          proposalIdsVisibleToScope(ctx.db, scope),
          clientIdsVisibleToScope(ctx.db, scope),
          canUseVendors(ctx),
        ]);

        // The access helpers give null for every one.
        const proposalWhere =
          proposalIds === null
            ? undefined
            : proposalIds.length > 0
              ? inArray(proposalTable.id, proposalIds)
              : sql`0=1`;

        const [proposalRows, mainClients, vendors, userRows] =
          await Promise.all([
            ctx.db
              .select({ status: proposalTable.status, count: count() })
              .from(proposalTable)
              .where(proposalWhere)
              .groupBy(proposalTable.status),
            clientIds === null
              ? ctx.db
                  .select({ count: count() })
                  .from(parentClientTable)
                  .then(([row]) => Number(row?.count ?? 0))
              : parentClientIdsOfClients(ctx.db, clientIds).then(
                  (ids) => ids.length,
                ),
            showVendors
              ? ctx.db
                  .select({ count: count() })
                  .from(contractorTable)
                  .then(([row]) => Number(row?.count ?? 0))
              : Promise.resolve(null),
            isAdmin
              ? ctx.db
                  .select({ role: userTable.role, count: count() })
                  .from(userTable)
                  .groupBy(userTable.role)
              : Promise.resolve(null),
          ]);

        const proposals = {
          total: 0,
          [PROPOSAL_STATUS.PENDING]: 0,
          [PROPOSAL_STATUS.APPROVED]: 0,
          [PROPOSAL_STATUS.REJECTED]: 0,
        };
        for (const row of proposalRows) {
          proposals[row.status] += Number(row.count);
          proposals.total += Number(row.count);
        }

        return {
          proposals,
          mainClients,
          // Null when the user can't see vendors.
          vendors,
          // Null for anyone but an admin.
          users: userRows && {
            total: userRows.reduce(
              (total, row) => total + Number(row.count),
              0,
            ),
            byRole: Object.fromEntries(
              userRows.map((row) => [row.role, Number(row.count)]),
            ) as Record<string, number>,
          },
        };
      } catch (error) {
        throw fromDatabaseError(error, "Counting records");
      }
    }),
  ),

  // A page of the offices with visible work orders, those with the most
  // pending work first unless sorted otherwise, each with its work orders by
  // status, its sites and what has been spent in its work orders; and how
  // many offices match. Narrowed by a search of their names, codes and
  // cities, and by state.
  getOfficeBreakdown: protectedProcedure
    .input(
      z
        .object({
          search: z.string().trim().max(100).optional(),
          state: z.string().trim().min(1).max(100).optional(),
          sort: z.enum(OFFICE_SORTS).default("pending"),
          ...pageInput(TOP_OFFICES),
        })
        .optional(),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const visible = await visibleWorkOrders(ctx);
        const { page = 1, limit = TOP_OFFICES, sort = "pending" } = input ?? {};
        const term = input?.search ? `%${escapeLike(input.search)}%` : null;
        const where = and(
          visible,
          input?.state ? eq(officeTable.state, input.state) : undefined,
          term
            ? or(
                like(officeTable.name, term),
                like(officeTable.code, term),
                like(officeTable.city, term),
              )
            : undefined,
        );

        // What has been spent in each office's visible work orders, so the
        // offices can be sorted by it.
        const officeSpend = ctx.db
          .select({
            office_id: wo.office_id,
            spent: sum(e.amount).as("spent"),
          })
          .from(e)
          .innerJoin(wos, eq(e.work_order_site_id, wos.id))
          .innerJoin(wo, eq(wos.work_order_id, wo.id))
          .where(visible)
          .groupBy(wo.office_id)
          .as("office_spend");

        const pending = countWhere(stillPending());
        const spent = sql<string>`coalesce(max(${officeSpend.spent}), 0)`;
        const order = {
          pending: [desc(pending), desc(count())],
          total: [desc(count()), desc(pending)],
          spent: [desc(spent)],
          name: [],
        }[sort];

        try {
          const [officeRows, [officeCount]] = await Promise.all([
            ctx.db
              .select({
                id: officeTable.id,
                code: officeTable.code,
                name: officeTable.name,
                city: officeTable.city,
                state: officeTable.state,
                total: count(),
                pending,
                spent,
              })
              .from(wo)
              .innerJoin(officeTable, eq(wo.office_id, officeTable.id))
              .leftJoin(officeSpend, eq(officeSpend.office_id, officeTable.id))
              .where(where)
              .groupBy(officeTable.id)
              .orderBy(...order, asc(officeTable.name), asc(officeTable.id))
              .limit(limit)
              .offset(pageOffset(page, limit)),
            ctx.db
              .select({ count: countDistinct(wo.office_id) })
              .from(wo)
              .innerJoin(officeTable, eq(wo.office_id, officeTable.id))
              .where(where),
          ]);

          const total = Number(officeCount?.count ?? 0);
          const officeIds = officeRows.map((row) => row.id);
          const siteRows =
            officeIds.length === 0
              ? []
              : await ctx.db
                  .select({ office_id: siteTable.office_id, count: count() })
                  .from(siteTable)
                  .where(inArray(siteTable.office_id, officeIds))
                  .groupBy(siteTable.office_id);

          return {
            offices: officeRows.map((row) => {
              const workOrders = Number(row.total);
              const pendingCount = Number(row.pending);
              return {
                ...row,
                total: workOrders,
                pending: pendingCount,
                completed: workOrders - pendingCount,
                sites: Number(
                  siteRows.find((site) => site.office_id === row.id)?.count ??
                    0,
                ),
                spent: Number(row.spent),
              };
            }),
            officeCount: total,
            pagination: buildPagination({
              page,
              limit,
              total,
              shown: officeRows.length,
            }),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Breaking work down by office");
        }
      }),
    ),
});

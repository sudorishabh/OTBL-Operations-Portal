import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import {
  CODE_PREFIX,
  constants,
  effectiveWorkOrderStatusFromDbOnly,
  type EffectiveWorkOrderStatus,
} from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure, publicProcedure } from "../../core";
import {
  type AccessScope,
  andScope,
  assertCanAccessOffice,
  getAccessScope,
  resolveVisibleOfficeIds,
  workOrderScopeWhere,
} from "../../access-scope";
import { officeSchemas } from "@pkg/schema";
import { fromDatabaseError, isAppError, notFound } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { codeMatches } from "../../helper/record-code";
import { buildPagination, pageOffset } from "../../helper/pagination";
import { batchEffectiveWorkOrderStatuses } from "../work-order/batch-effective-work-order-status";

const {
  officeTable,
  officeUserTable,
  userTable,
  workOrderTable,
  workOrderSiteTable,
  siteTable,
  scheduleOfRatesTable,
  bioremediationContSoilTable,
} = schema;
const { ROLES, STATUS } = constants;

// How many of its newest sites each office in the list shows.
const LATEST_SITES = 6;

// Each site of these offices, numbered from its office's newest.
const sitesRankedByNewest = (db: Database, officeIds: number[]) =>
  db
    .select({
      id: siteTable.id,
      code: siteTable.code,
      office_id: siteTable.office_id,
      name: siteTable.name,
      city: siteTable.city,
      status: siteTable.status,
      created_at: siteTable.created_at,
      site_rank:
        sql<number>`row_number() over (partition by ${siteTable.office_id} order by ${siteTable.created_at} desc, ${siteTable.id} desc)`.as(
          "site_rank",
        ),
    })
    .from(siteTable)
    .where(inArray(siteTable.office_id, officeIds))
    .as("ranked_sites");

// The offices a user may see: all of them, those they belong to, or none for
// users who only work on sites.
const visibleOfficesWhere = async (db: Database, scope: AccessScope) => {
  if (scope.kind !== "restricted") return undefined;
  if (scope.ui === "site_only" || scope.ui === "wo_site_upload") {
    return eq(officeTable.id, -1);
  }
  const visibleOfficeIds = (await resolveVisibleOfficeIds(db, scope)) ?? [];
  return visibleOfficeIds.length > 0
    ? inArray(officeTable.id, visibleOfficeIds)
    : eq(officeTable.id, -1);
};

export const officeQueryRouter = router({
  getOffices: protectedProcedure.input(officeSchemas.getOfficesSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { searchQuery, status, state, officeNamesOrder, page, limit } =
        input;

      let officeQuery = undefined;

      if (status && status !== "all") {
        officeQuery = and(officeQuery, eq(officeTable.status, status));
      }

      if (state) {
        officeQuery = and(officeQuery, eq(officeTable.state, state));
      }

      if (searchQuery && searchQuery.trim() !== "") {
        const term = `%${escapeLike(searchQuery)}%`;
        officeQuery = and(
          officeQuery,
          or(
            codeMatches(officeTable.code, CODE_PREFIX.OFFICE, searchQuery),
            like(officeTable.name, term),
            like(officeTable.address, term),
            like(officeTable.city, term),
            like(officeTable.state, term),
            like(officeTable.email, term),
          ),
        );
      }

      const officeOrder =
        officeNamesOrder === "asc"
          ? asc(officeTable.name)
          : officeNamesOrder === "desc"
            ? desc(officeTable.name)
            : officeNamesOrder === "latest"
              ? desc(officeTable.created_at)
              : asc(officeTable.created_at);

      try {
        const currentUserId = Number(ctx.user!.sub);
        const isAdmin = ctx.user!.role === ROLES.ADMIN;
        const scope = await getAccessScope(
          ctx.db,
          currentUserId,
          ctx.user!.role,
        );
        const officeWhere = and(
          officeQuery,
          await visibleOfficesWhere(ctx.db, scope),
        );

        const officeList = ctx.db
          .select()
          .from(officeTable)
          .where(officeWhere)
          // The id breaks ties so offices never repeat or go missing across pages.
          .orderBy(officeOrder, asc(officeTable.id));

        const offices = page
          ? await officeList.limit(limit).offset(pageOffset(page, limit))
          : await officeList;

        let total = offices.length;
        if (page) {
          const [totalResult] = await ctx.db
            .select({ count: count() })
            .from(officeTable)
            .where(officeWhere);
          total = totalResult?.count ?? 0;
        }

        // Members, site counts and work order counts for the whole page at
        // once rather than office by office.
        const officeIds = offices.map((office) => office.id);
        const rankedSites = sitesRankedByNewest(ctx.db, officeIds);
        const [members, siteCounts, workOrderCounts, latestSites] =
          officeIds.length === 0
            ? [[], [], [], []]
            : await Promise.all([
                ctx.db
                  .select({
                    office_id: officeUserTable.office_id,
                    id: userTable.id,
                    code: userTable.code,
                    name: userTable.name,
                    email: userTable.email,
                  })
                  .from(officeUserTable)
                  .innerJoin(
                    userTable,
                    eq(officeUserTable.user_id, userTable.id),
                  )
                  .where(inArray(officeUserTable.office_id, officeIds))
                  .orderBy(asc(userTable.name), asc(userTable.id)),
                ctx.db
                  .select({
                    office_id: siteTable.office_id,
                    status: siteTable.status,
                    count: count(),
                  })
                  .from(siteTable)
                  .where(inArray(siteTable.office_id, officeIds))
                  .groupBy(siteTable.office_id, siteTable.status),
                // Only the work orders the user can see, as on the office's
                // page.
                ctx.db
                  .select({
                    office_id: workOrderTable.office_id,
                    count: count(),
                  })
                  .from(workOrderTable)
                  .where(
                    andScope(
                      inArray(workOrderTable.office_id, officeIds),
                      workOrderScopeWhere(scope),
                    ),
                  )
                  .groupBy(workOrderTable.office_id),
                ctx.db
                  .select({
                    id: rankedSites.id,
                    office_id: rankedSites.office_id,
                    name: rankedSites.name,
                    city: rankedSites.city,
                    status: rankedSites.status,
                    created_at: rankedSites.created_at,
                  })
                  .from(rankedSites)
                  .where(lte(rankedSites.site_rank, LATEST_SITES))
                  .orderBy(
                    asc(rankedSites.office_id),
                    asc(rankedSites.site_rank),
                  ),
              ]);

        const officesWithUsersAndSitesCount = offices.map((office) => {
          const operators = members.filter(
            (member) => member.office_id === office.id,
          );
          const sites = siteCounts.filter((row) => row.office_id === office.id);

          return {
            ...office,
            operators,
            siteCount: sites.reduce((sum, row) => sum + row.count, 0),
            activeSiteCount: sites
              .filter((row) => row.status === STATUS.ACTIVE)
              .reduce((sum, row) => sum + row.count, 0),
            workOrderCount:
              workOrderCounts.find((row) => row.office_id === office.id)
                ?.count ?? 0,
            // Newest first.
            latestSites: latestSites
              .filter((site) => site.office_id === office.id)
              .map(({ office_id, ...site }) => site),
            // Admins change the office and its members; its operators and
            // admins look after its sites.
            canManage: isAdmin,
            canEditSites:
              isAdmin ||
              operators.some((operator) => operator.id === currentUserId),
          };
        });

        return {
          offices: officesWithUsersAndSitesCount,
          pagination: buildPagination({
            page,
            limit,
            total,
            shown: offices.length,
          }),
        };
      } catch (error) {
        throw fromDatabaseError(error, "Fetching offices");
      }
    }),
  ),

  // Every office the user can see, with only what list filters show and
  // search by; also gives the states offices are in.
  getOfficeOptions: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role,
      );

      try {
        return await ctx.db
          .select({
            id: officeTable.id,
            code: officeTable.code,
            name: officeTable.name,
            city: officeTable.city,
            state: officeTable.state,
          })
          .from(officeTable)
          .where(await visibleOfficesWhere(ctx.db, scope))
          .orderBy(asc(officeTable.name), asc(officeTable.id));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching office options");
      }
    }),
  ),

  // One office for its own page: its details and office operators,
  // and totals across its sites and work orders.
  getOffice: protectedProcedure.input(officeSchemas.getOfficeSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { officeId } = input;

      try {
        const currentUserId = Number(ctx.user!.sub);
        const isAdmin = ctx.user!.role === ROLES.ADMIN;
        const scope = await getAccessScope(
          ctx.db,
          currentUserId,
          ctx.user!.role,
        );

        const [office] = await ctx.db
          .select()
          .from(officeTable)
          .where(eq(officeTable.id, officeId));
        if (!office) throw notFound("Office", officeId);

        await assertCanAccessOffice(ctx.db, scope, officeId);

        const operators = await ctx.db
          .select({
            id: userTable.id,
            code: userTable.code,
            name: userTable.name,
            email: userTable.email,
            contact_number: userTable.contact_number,
          })
          .from(officeUserTable)
          .innerJoin(userTable, eq(officeUserTable.user_id, userTable.id))
          .where(eq(officeUserTable.office_id, officeId))
          .orderBy(asc(userTable.name), asc(userTable.id));

        const siteCounts = await ctx.db
          .select({ status: siteTable.status, count: count() })
          .from(siteTable)
          .where(eq(siteTable.office_id, officeId))
          .groupBy(siteTable.status);

        const sites = { total: 0, active: 0 };
        for (const row of siteCounts) {
          sites.total += row.count;
          if (row.status === STATUS.ACTIVE) sites.active += row.count;
        }

        // The same work orders the work order list shows for this office.
        const officeWorkOrders = await ctx.db
          .select({
            id: workOrderTable.id,
            office_id: workOrderTable.office_id,
            status: workOrderTable.status,
          })
          .from(workOrderTable)
          .where(
            andScope(
              eq(workOrderTable.office_id, officeId),
              workOrderScopeWhere(scope),
            ),
          );

        const effectiveById = await batchEffectiveWorkOrderStatuses(
          ctx.db,
          scope,
          officeWorkOrders.map((workOrder) => ({
            id: Number(workOrder.id),
            office_id: workOrder.office_id ?? null,
            status: String(workOrder.status ?? ""),
          })),
        );

        const workOrders: Record<EffectiveWorkOrderStatus | "total", number> = {
          total: officeWorkOrders.length,
          pending: 0,
          completed: 0,
          cancelled: 0,
        };
        for (const workOrder of officeWorkOrders) {
          const status =
            effectiveById.get(Number(workOrder.id)) ??
            effectiveWorkOrderStatusFromDbOnly(String(workOrder.status));
          workOrders[status] += 1;
        }

        // Budget and activity spend, counted as the client page counts them.
        let totalBudgetAmount = 0;
        let totalExpenseAmount = 0;
        const workOrderIds = officeWorkOrders.map((workOrder) => workOrder.id);

        if (workOrderIds.length > 0) {
          const rates = await ctx.db
            .select({ total_cost: scheduleOfRatesTable.total_cost })
            .from(scheduleOfRatesTable)
            .where(inArray(scheduleOfRatesTable.work_order_id, workOrderIds));
          totalBudgetAmount = rates.reduce(
            (sum, rate) => sum + Number(rate.total_cost || 0),
            0,
          );

          // Only bioremediation completion earns income; restoration tracks
          // its expenses alone.
          const completions = await ctx.db
            .select({ amount: bioremediationContSoilTable.amount })
            .from(bioremediationContSoilTable)
            .innerJoin(
              workOrderSiteTable,
              eq(
                bioremediationContSoilTable.work_order_site_id,
                workOrderSiteTable.id,
              ),
            )
            .where(
              and(
                inArray(workOrderSiteTable.work_order_id, workOrderIds),
                eq(bioremediationContSoilTable.type, "completion"),
              ),
            );
          totalExpenseAmount = completions.reduce(
            (sum, completion) => sum + Number(completion.amount || 0),
            0,
          );
        }

        return {
          office,
          operators,
          canManage: isAdmin,
          canEditSites:
            isAdmin ||
            operators.some((operator) => operator.id === currentUserId),
          sites,
          workOrders,
          totalBudgetAmount,
          totalExpenseAmount,
        };
      } catch (error) {
        if (isAppError(error)) throw error;
        throw fromDatabaseError(error, "Fetching office details");
      }
    }),
  ),

  getOfficeUsers: protectedProcedure
    .input(officeSchemas.getOfficeUsersSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessOffice(ctx.db, scope, input.office_id);

          const operators = await ctx.db
            .select({
              id: userTable.id,
              code: userTable.code,
              name: userTable.name,
              email: userTable.email,
              contact_number: userTable.contact_number,
              officeUserId: officeUserTable.id,
            })
            .from(officeUserTable)
            .innerJoin(userTable, eq(officeUserTable.user_id, userTable.id))
            .where(eq(officeUserTable.office_id, input.office_id));

          return { operators };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching office users");
        }
      }),
    ),
});

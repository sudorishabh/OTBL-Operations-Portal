import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure, publicProcedure } from "../../core";
import {
  type AccessScope,
  assertCanAccessOffice,
  getAccessScope,
  resolveVisibleOfficeIds,
} from "../../access-scope";
import { officeSchemas } from "@pkg/schema";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { buildPagination, pageOffset } from "../../helper/pagination";

const {
  officeTable,
  officeUserTable,
  userTable,
  workOrderTable,
  workOrderSiteTable,
  siteTable,
} = schema;
const { ROLES } = constants;

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
      const { searchQuery, status, officeNamesOrder, page, limit } = input;

      let officeQuery = undefined;

      if (status && status !== "all") {
        officeQuery = and(officeQuery, eq(officeTable.status, status));
      }

      if (searchQuery && searchQuery.trim() !== "") {
        officeQuery = and(
          officeQuery,
          or(
            like(officeTable.name, `%${escapeLike(searchQuery)}%`),
            like(officeTable.address, `%${escapeLike(searchQuery)}%`),
            like(officeTable.email, `%${escapeLike(searchQuery)}%`),
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

        const officesWithUsersAndSitesCount = await Promise.all(
          offices.map(async (office: any) => {
            const users = await ctx.db
              .select({
                id: userTable.id,
                name: userTable.name,
                email: userTable.email,
                role: officeUserTable.role,
              })
              .from(officeUserTable)
              .leftJoin(userTable, eq(officeUserTable.user_id, userTable.id))
              .where(eq(officeUserTable.office_id, office.id));

            const [siteCount] = await ctx.db
              .select({ count: count() })
              .from(siteTable)
              .where(eq(siteTable.office_id, office.id));

            const manager = users.find((u: any) => u.role === ROLES.MANAGER);
            const operators = users.filter((u: any) => u.role === "operator");

            const canManage = isAdmin || manager?.id === currentUserId;

            return {
              ...office,
              manager,
              operators,
              siteCount: siteCount?.count || 0,
              canManage,
            };
          }),
        );

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

  getOfficeWorkOrders: protectedProcedure
    .input(officeSchemas.getOfficeWorkOrderSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessOffice(ctx.db, scope, input.officeId);

          const all = await ctx.db
            .select()
            .from(workOrderTable)
            .where(eq(workOrderTable.office_id, input.officeId));

          const active = all.filter((wo: any) => wo.status === "pending");
          const completed = all.filter((wo: any) => wo.status === "completed");

          return { active, completed };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching office work orders");
        }
      }),
    ),

  getOfficeStats: protectedProcedure
    .input(officeSchemas.getOfficeStatsSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessOffice(ctx.db, scope, input.officeId);

          const workOrders = await ctx.db
            .select({ id: workOrderTable.id })
            .from(workOrderTable)
            .where(eq(workOrderTable.office_id, input.officeId));

          const workOrderIds = workOrders.map((w: any) => w.id);

          let siteCount = 0;
          let totalBudgetAmount = 0;
          let totalExpenseAmount = 0;
          let completedWorkOrders = 0;

          if (workOrderIds.length > 0) {
            const woSites = await ctx.db
              .select({ id: workOrderSiteTable.id })
              .from(workOrderSiteTable)
              .where(eq(workOrderSiteTable.work_order_id, workOrderIds[0]));

            if (workOrderIds.length > 1) {
              for (let i = 1; i < workOrderIds.length; i++) {
                const more = await ctx.db
                  .select({ id: workOrderSiteTable.id })
                  .from(workOrderSiteTable)
                  .where(eq(workOrderSiteTable.work_order_id, workOrderIds[i]));
                woSites.push(...more);
              }
            }

            siteCount = woSites.length;

            const woRows = await ctx.db
              .select({
                status: workOrderTable.status,
              })
              .from(workOrderTable)
              .where(eq(workOrderTable.office_id, input.officeId));

            for (const row of woRows) {
              if (row.status === "completed") completedWorkOrders += 1;
            }
          }

          return {
            siteCount,
            completedWorkOrders,
            totalBudgetAmount,
            totalExpenseAmount,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching office statistics");
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

          const users = await ctx.db
            .select({
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
              contact_number: userTable.contact_number,
              role: officeUserTable.role,
              officeUserId: officeUserTable.id,
            })
            .from(officeUserTable)
            .innerJoin(userTable, eq(officeUserTable.user_id, userTable.id))
            .where(eq(officeUserTable.office_id, input.office_id));

          const manager = users.find((u: any) => u.role === "office_manager");
          const operators = users.filter((u: any) => u.role === "operator");

          return {
            manager,
            operators,
            allUsers: users,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching office users");
        }
      }),
    ),
});

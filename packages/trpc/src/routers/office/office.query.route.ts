import { and, asc, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure, publicProcedure } from "../../core";
import {
  assertCanAccessOffice,
  getAccessScope,
  resolveVisibleOfficeIds,
} from "../../access-scope";
import { officeSchemas } from "@pkg/schema";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";

const {
  officeTable,
  officeUserTable,
  userTable,
  workOrderTable,
  workOrderSiteTable,
  siteTable,
} = schema;
const { ROLES } = constants;

export const officeQueryRouter = router({
  // Get all offices with users
  getOffices: protectedProcedure.input(officeSchemas.getOfficesSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { searchQuery, status, officeNamesOrder } = input;

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
        let officeWhere = officeQuery;

        if (scope.kind === "restricted") {
          if (scope.ui === "site_only" || scope.ui === "wo_site_upload") {
            const noOffices = eq(officeTable.id, -1);
            officeWhere = officeQuery ? and(officeQuery, noOffices) : noOffices;
          } else {
            const visibleOfficeIds =
              (await resolveVisibleOfficeIds(ctx.db, scope)) ?? [];
            const scopeFilter =
              visibleOfficeIds.length > 0
                ? inArray(officeTable.id, visibleOfficeIds)
                : eq(officeTable.id, -1);
            officeWhere = officeQuery
              ? and(officeQuery, scopeFilter)
              : scopeFilter;
          }
        }

        const offices = await ctx.db
          .select()
          .from(officeTable)
          .where(officeWhere)
          .orderBy(officeOrder);

        // Get users for each office
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
            // u.role here is the office-membership role (office_users.role),
            // whose operator value is the literal "operator" — not the global
            // user role.
            const operators = users.filter((u: any) => u.role === "operator");

            // Per-office member-management capability: an admin, or the
            // manager of this specific office. Used to gate member controls.
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

        return { offices: officesWithUsersAndSitesCount };
      } catch (error) {
        throw fromDatabaseError(error, "Fetching offices");
      }
    }),
  ),

  // Get work orders for an office
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

  // Get office statistics
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

  // Get users assigned to an office
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

          const manager = users.find((u: any) => u.role === "manager");
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

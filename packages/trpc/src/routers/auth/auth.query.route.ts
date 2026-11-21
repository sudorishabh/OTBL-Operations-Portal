import { eq } from "drizzle-orm";
import { type UserRole } from "@pkg/utils/auth";
import { schema } from "@pkg/db";
import { getAccessScope, getDashboardUi } from "../../access-scope";
import { router } from "../../trpc";
import { protectedProcedure, publicProcedure } from "../../middleware";
import { handleQuery } from "../../helper/typed-handler";

const { userTable, workOrderSiteTable } = schema;

export const authQueryRouter = router({
  // The signed-in user, from their Better Auth session; signing in and out
  // are Better Auth's own routes, under /api/auth.
  me: publicProcedure.query(
    handleQuery(async ({ ctx }) => {
      if (!ctx.user) return { success: false as const, user: null };

      const [user] = await ctx.db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          role: userTable.role,
        })
        .from(userTable)
        .where(eq(userTable.id, Number(ctx.user.sub)));

      return user
        ? { success: true as const, user }
        : { success: false as const, user: null };
    }),
  ),

  hasRole: protectedProcedure.query(({ ctx }) => {
    return {
      success: true,
      role: ctx.user.role,
    };
  }),

  dashboardLayout: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role as UserRole,
      );
      const ui = getDashboardUi(scope);

      if (ui.mode !== "wo_site_upload" || !ui.defaultWorkOrderSiteId) {
        return {
          success: true as const,
          ...ui,
          workOrderId: null as number | null,
        };
      }

      const [row] = await ctx.db
        .select({ work_order_id: workOrderSiteTable.work_order_id })
        .from(workOrderSiteTable)
        .where(eq(workOrderSiteTable.id, ui.defaultWorkOrderSiteId))
        .limit(1);

      return {
        success: true as const,
        ...ui,
        workOrderId: row?.work_order_id ?? null,
      };
    }),
  ),
});

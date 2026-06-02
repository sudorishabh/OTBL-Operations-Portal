import { eq } from "drizzle-orm";
import {
  signToken,
  signRefreshToken,
  setAuthenticationCookies,
  verifyRefreshTokenSafe,
  type UserRole,
} from "@pkg/utils/auth";
import { schema } from "@pkg/db";
import { getAccessScope, getDashboardUi } from "../../access-scope";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure, publicProcedure } from "../../middleware";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";

const { STATUS } = constants;
const { userTable, workOrderSiteTable } = schema;

export const authQueryRouter = router({
  me: publicProcedure.query(
    handleQuery(async ({ ctx }) => {
      try {
        if (ctx.user) {
          const existingUser = await ctx.db
            .select({
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
              role: userTable.role,
              status: userTable.status,
            })
            .from(userTable)
            .where(eq(userTable.id, parseInt(ctx.user!.sub)));

          const user = existingUser[0];

          if (user && user.status === STATUS.ACTIVE) {
            return {
              success: true,
              user,
            };
          }
        }

        const refreshToken = ctx.req?.cookies?.refreshToken;

        if (!refreshToken) {
          return {
            success: false,
            user: null,
          };
        }

        const verificationResult = verifyRefreshTokenSafe(
          refreshToken,
          ctx.appEnv.JWT.REFRESH_SECRET,
        );

        if (!verificationResult.success) {
          return {
            success: false,
            user: null,
          };
        }

        const payload = verificationResult.payload;

        const existingUser = await ctx.db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            role: userTable.role,
            status: userTable.status,
          })
          .from(userTable)
          .where(eq(userTable.id, parseInt(payload.sub)));

        const user = existingUser[0];

        if (!user || user.status !== STATUS.ACTIVE) {
          return {
            success: false,
            user: null,
          };
        }

        const tokenPayload = {
          sub: user.id.toString(),
          email: user.email,
          role: user.role as UserRole,
        };

        const newAccessToken = signToken(
          tokenPayload,
          ctx.appEnv.JWT.SECRET,
          ctx.appEnv.JWT.EXPIRES_IN,
        );

        const newRefreshToken = signRefreshToken(
          tokenPayload,
          ctx.appEnv.JWT.REFRESH_SECRET,
          ctx.appEnv.JWT.REFRESH_EXPIRES_IN,
        );

        setAuthenticationCookies({
          res: ctx.res,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          accessExpiresIn: ctx.appEnv.JWT.EXPIRES_IN,
          refreshExpiresIn: ctx.appEnv.JWT.REFRESH_EXPIRES_IN,
          node_env: ctx.appEnv.NODE_ENV,
        });

        return {
          success: true,
          user,
        };
      } catch (error) {
        console.error("[Auth] Get current user error:", error);
        return {
          success: false,
          user: null,
        };
      }
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

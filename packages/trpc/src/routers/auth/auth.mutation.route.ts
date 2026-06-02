import {
  signToken,
  signRefreshToken,
  setAuthenticationCookies,
  clearAuthenticationCookies,
  verifyPassword,
  verifyRefreshTokenSafe,
  type UserRole,
} from "@pkg/utils/auth";
import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { publicProcedure } from "../../middleware";
import { router } from "../../trpc";
import { authSchemas } from "@pkg/schema";
import { unauthorized, internal, fromDatabaseError } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { z } from "zod";

const { STATUS } = constants;
const { userTable } = schema;

export const authMutationRouter = router({
  login: publicProcedure.input(authSchemas.loginSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { email, password } = input;

      let users;
      try {
        users = await ctx.db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            role: userTable.role,
            status: userTable.status,
            password: userTable.password,
          })
          .from(userTable)
          .where(eq(userTable.email, email));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching user for login");
      }

      const user = users?.[0];

      if (!user) {
        throw unauthorized("Invalid email or password, please try again.", {
          devMessage: `No user found with email: ${email}`,
        });
      }

      if (user.status !== STATUS.ACTIVE) {
        throw unauthorized(
          "Your account is inactive. Please contact support.",
          {
            devMessage: `User ${email} has status: ${user.status}`,
          },
        );
      }

      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw unauthorized("Invalid email or password, please try again.", {
          devMessage: "Password verification failed",
        });
      }

      const payload = {
        sub: user.id.toString(),
        email: user.email,
        role: user.role as UserRole,
      };

      const accessToken = signToken(
        payload,
        ctx.appEnv.JWT.SECRET,
        ctx.appEnv.JWT.EXPIRES_IN,
      );

      const refreshToken = signRefreshToken(
        payload,
        ctx.appEnv.JWT.REFRESH_SECRET,
        ctx.appEnv.JWT.REFRESH_EXPIRES_IN,
      );

      setAuthenticationCookies({
        res: ctx.res,
        accessToken,
        refreshToken,
        accessExpiresIn: ctx.appEnv.JWT.EXPIRES_IN,
        refreshExpiresIn: ctx.appEnv.JWT.REFRESH_EXPIRES_IN,
        node_env: ctx.appEnv.NODE_ENV,
      });

      return {
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      };
    }),
  ),

  logout: publicProcedure.mutation(
    handleMutation(async ({ ctx }) => {
      try {
        clearAuthenticationCookies(ctx.res);

        return {
          success: true,
          message: "Logged out successfully",
        };
      } catch (error) {
        throw internal("Failed to clear authentication cookies", {
          cause: error,
          userMessage:
            "An unexpected error occurred during logout. Please try again.",
        });
      }
    }),
  ),

  refreshToken: publicProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { refreshToken: token } = input;

        const result = verifyRefreshTokenSafe(
          token,
          ctx.appEnv.JWT.REFRESH_SECRET,
        );

        if (!result.success) {
          throw unauthorized("Session expired. Please log in again.", {
            devMessage: `Refresh token verification failed: ${result.error}`,
          });
        }

        const payload = result.payload;

        let users;
        try {
          users = await ctx.db
            .select({
              id: userTable.id,
              name: userTable.name,
              email: userTable.email,
              role: userTable.role,
              status: userTable.status,
            })
            .from(userTable)
            .where(eq(userTable.id, parseInt(payload.sub)));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching user for token refresh");
        }

        const user = users?.[0];

        if (!user || user.status !== STATUS.ACTIVE) {
          throw unauthorized(
            "Your account is no longer active. Please contact support.",
            {
              devMessage: `User ${payload.sub} not found or inactive`,
            },
          );
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

        return {
          success: true,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
        };
      }),
    ),
});

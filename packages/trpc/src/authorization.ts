import { t } from "./trpc";
import type { TrpcUser, TrpcAuthenticatedContext } from "./context";
import { USER_ROLES, ROLE_HIERARCHY, type UserRole } from "@pkg/utils/auth";
import {
  createUnauthorizedError,
  createInsufficientPermissionsError,
  appErrorToTRPCError,
} from "./errors";

// Re-export role constants for use in routers
export { USER_ROLES, ROLE_HIERARCHY };
export type { UserRole };

/**
 * Authentication middleware - ensures user is logged in
 * Throws UNAUTHORIZED if no user is present in context
 */
export const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw appErrorToTRPCError(
      createUnauthorizedError("You must be logged in to access this resource", {
        devMessage: "No user in context",
      }),
    );
  }

  if (!ctx.user.sub) {
    throw appErrorToTRPCError(
      createUnauthorizedError(
        "Invalid authentication token. Please log in again.",
        { devMessage: "User context missing sub claim" },
      ),
    );
  }

  // Pass the user with guaranteed type to next middleware/procedure
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    } as TrpcAuthenticatedContext,
  });
});

/**
 * Role-based authorization middleware factory
 * @param minRole - Minimum role level required to access the procedure
 * @returns Middleware that checks if user has at least the minimum role
 */
export const hasRole = (minRole: UserRole) => {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw appErrorToTRPCError(
        createUnauthorizedError(
          "You must be logged in to access this resource",
          { devMessage: "No user in context for role check" },
        ),
      );
    }

    const userRole = ctx.user.role as UserRole;
    const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredRoleLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      throw appErrorToTRPCError(
        createInsufficientPermissionsError(minRole, {
          devMessage: `User role "${userRole}" (level ${userRoleLevel}) is below required role "${minRole}" (level ${requiredRoleLevel})`,
        }),
      );
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      } as TrpcAuthenticatedContext,
    });
  });
};

/**
 * Multi-role authorization middleware factory
 * @param allowedRoles - Array of roles that can access the procedure
 * @returns Middleware that checks if user has one of the allowed roles
 */
export const hasAnyRole = (allowedRoles: UserRole[]) => {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw appErrorToTRPCError(
        createUnauthorizedError(
          "You must be logged in to access this resource",
          {
            devMessage: "No user in context for role check",
          },
        ),
      );
    }

    const userRole = ctx.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      throw appErrorToTRPCError(
        createInsufficientPermissionsError(allowedRoles.join(", "), {
          userMessage: "You don't have permission to access this resource.",
          devMessage: `User role "${userRole}" not in allowed roles: [${allowedRoles.join(", ")}]`,
        }),
      );
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      } as TrpcAuthenticatedContext,
    });
  });
};

/**
 * Read-only enforcement for the viewer role.
 *
 * Viewers may read everything but must never write. Mutations are gated
 * inconsistently across routers (admin / manager / protected / public), so
 * instead of relying on the role hierarchy we deny every mutation centrally
 * here. This middleware is attached to `publicProcedure`, so all procedures
 * inherit it. Auth mutations (login / logout / refresh) are exempt so a
 * viewer can still sign in and out.
 */
export const denyViewerWrites = t.middleware(({ ctx, type, path, next }) => {
  if (
    type === "mutation" &&
    ctx.user?.role === USER_ROLES.VIEWER &&
    !path.startsWith("authMutation.")
  ) {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError("a role with write access", {
        userMessage:
          "Viewers have read-only access and cannot make changes.",
        devMessage: `Viewer role attempted mutation "${path}"`,
      }),
    );
  }

  return next();
});

/**
 * Preset role middlewares for common use cases
 */
export const isAdmin = hasRole(USER_ROLES.ADMIN);
export const isManager = hasRole(USER_ROLES.MANAGER);
// Operator-or-higher: office_operator and site_operator share the same
// hierarchy level, so this threshold admits either operator plus manager/admin.
export const isOperator = hasRole(USER_ROLES.OFFICE_OPERATOR);

/**
 * Admin or Manager middleware
 */
export const isAdminOrManager = hasAnyRole([
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
]);


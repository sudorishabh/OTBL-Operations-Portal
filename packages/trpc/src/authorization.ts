import { t } from "./trpc";
import type { TrpcUser, TrpcAuthenticatedContext } from "./context";
import { USER_ROLES, ROLE_HIERARCHY, type UserRole } from "@pkg/utils/auth";
import {
  createUnauthorizedError,
  createInsufficientPermissionsError,
  appErrorToTRPCError,
} from "./errors";

export { USER_ROLES, ROLE_HIERARCHY };
export type { UserRole };

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

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    } as TrpcAuthenticatedContext,
  });
});

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

export const isAdmin = hasRole(USER_ROLES.ADMIN);
export const isManager = hasRole(USER_ROLES.MANAGER);
export const isOperator = hasRole(USER_ROLES.OFFICE_OPERATOR);

export const isAdminOrManager = hasAnyRole([
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
]);

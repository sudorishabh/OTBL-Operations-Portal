// Who may call what. The signed-in user comes from their Better Auth session,
// and what their role allows is Better Auth's access control, shared with the
// web app in @pkg/auth/permissions. Which records a user sees within that is
// narrowed by their offices and sites, in access-scope.ts.
import { t } from "./trpc";
import type { TrpcAuthenticatedContext } from "./context";
import { USER_ROLES, type UserRole } from "@pkg/utils/auth";
import { can, type Permissions } from "@pkg/auth/permissions";
import {
  createUnauthorizedError,
  createInsufficientPermissionsError,
  appErrorToTRPCError,
} from "./errors";

export { USER_ROLES };
export type { UserRole };

export const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user?.sub) {
    throw appErrorToTRPCError(
      createUnauthorizedError("You must be logged in to access this resource", {
        devMessage: "No signed-in user in context",
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

// Lets through a signed-in user whose role grants every one of
// `permissions`; `action` says what was refused, as in "manage offices".
export const requirePermission = (permissions: Permissions, action: string) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user?.sub) {
      throw appErrorToTRPCError(
        createUnauthorizedError(
          "You must be logged in to access this resource",
          { devMessage: "No signed-in user for a permission check" },
        ),
      );
    }

    if (!can(ctx.user.role, permissions)) {
      throw appErrorToTRPCError(
        createInsufficientPermissionsError({
          userMessage: `You don't have permission to ${action}.`,
          devMessage: `Role "${ctx.user.role}" lacks ${JSON.stringify(permissions)}`,
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

// Setting the portal up, such as editing offices, vendors and users.
export const isAdmin = requirePermission(
  { portal: ["administer"] },
  "set up the portal",
);

// Sharing a document through a public link.
export const isOperator = requirePermission(
  { documents: ["share"] },
  "share documents",
);

// Anyone who may change records, which leaves out viewers.
export const canWriteRecords = requirePermission(
  { records: ["write"] },
  "change records",
);

// Every change needs a role that may write; viewers only read.
export const denyViewerWrites = t.middleware(({ ctx, type, path, next }) => {
  if (
    type === "mutation" &&
    ctx.user &&
    !can(ctx.user.role, { records: ["write"] })
  ) {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError({
        userMessage: "Viewers have read-only access and cannot make changes.",
        devMessage: `Role "${ctx.user.role}" attempted mutation "${path}"`,
      }),
    );
  }

  return next();
});

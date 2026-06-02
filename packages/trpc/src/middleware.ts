import { transformToTRPCError } from "./errors";
import { t } from "./trpc";
import { loggingMiddleware } from "./logging-middleware";
import {
  isAuthenticated,
  hasRole,
  hasAnyRole,
  isAdmin,
  isManager,
  isOperator,
  isAdminOrManager,
  denyViewerWrites,
  USER_ROLES,
  type UserRole,
} from "./authorization";

import * as schema from "@pkg/db/schema";
export { schema };

export { router } from "./trpc";

export {
  hasRole,
  hasAnyRole,
  isAdmin,
  isManager,
  isOperator,
  isAdminOrManager,
  USER_ROLES,
  type UserRole,
};

const errorHandlingMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw transformToTRPCError(error);
  }
});

export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware)
  .use(denyViewerWrites);

export const protectedProcedure = publicProcedure.use(isAuthenticated);

export const adminProcedure = publicProcedure.use(isAdmin);

export const managerProcedure = publicProcedure.use(isManager);

export const operatorProcedure = publicProcedure.use(isOperator);

export const createRoleProtectedProcedure = (minRole: UserRole) =>
  publicProcedure.use(hasRole(minRole));

export const createMultiRoleProcedure = (allowedRoles: UserRole[]) =>
  publicProcedure.use(hasAnyRole(allowedRoles));

export { t as trpc };

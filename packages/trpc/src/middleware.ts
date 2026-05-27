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

// Re-export authorization utilities for convenience
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

/**
 * Error handling middleware - transforms errors to proper tRPC errors
 * Uses the centralized error handling system for consistent error responses
 */
const errorHandlingMiddleware = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    throw transformToTRPCError(error);
  }
});

/**
 * Public procedure - accessible by anyone
 * Includes logging and error handling
 */
export const publicProcedure = t.procedure
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware)
  .use(denyViewerWrites);

/**
 * Protected procedure - requires authentication
 * User must be logged in to access
 */
export const protectedProcedure = publicProcedure.use(isAuthenticated);

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = publicProcedure.use(isAdmin);

/**
 * Manager procedure - requires manager role or higher
 */
export const managerProcedure = publicProcedure.use(isManager);

/**
 * Operator procedure - requires operator role or higher
 */
export const operatorProcedure = publicProcedure.use(isOperator);

/**
 * Factory function to create a role-protected procedure
 * @param minRole - Minimum role required
 * @returns A procedure that requires the specified minimum role
 */
export const createRoleProtectedProcedure = (minRole: UserRole) =>
  publicProcedure.use(hasRole(minRole));

/**
 * Factory function to create a procedure that allows specific roles
 * @param allowedRoles - Array of roles that can access
 * @returns A procedure that allows any of the specified roles
 */
export const createMultiRoleProcedure = (allowedRoles: UserRole[]) =>
  publicProcedure.use(hasAnyRole(allowedRoles));

// Export the tRPC instance for custom procedure/middleware creation
export { t as trpc };

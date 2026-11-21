import { transformToTRPCError } from "./errors";
import { t } from "./trpc";
import { loggingMiddleware } from "./logging-middleware";
import {
  isAuthenticated,
  isAdmin,
  isOperator,
  canWriteRecords,
  requirePermission,
  denyViewerWrites,
  USER_ROLES,
  type UserRole,
} from "./authorization";

import * as schema from "@pkg/db/schema";
export { schema };

export { router } from "./trpc";

export {
  isAdmin,
  isOperator,
  canWriteRecords,
  requirePermission,
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

export const operatorProcedure = publicProcedure.use(isOperator);

export { t as trpc };

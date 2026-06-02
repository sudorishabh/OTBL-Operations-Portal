import { router } from "./trpc";
import { officeMutationRouter } from "./routers/office/office.mutation.route";
import { officeQueryRouter } from "./routers/office/office.query.route";
import { siteMutationRouter } from "./routers/site/site.mutation.route";
import { siteQueryRouter } from "./routers/site/site.query.route";
import { userMutationRouter } from "./routers/user/user.mutation.route";
import { userQueryRouter } from "./routers/user/user.query.route";
import { authMutationRouter } from "./routers/auth/auth.mutation.route";
import { authQueryRouter } from "./routers/auth/auth.query.route";
import { clientMutationRouter } from "./routers/client/client.mutation.route";
import { clientQueryRouter } from "./routers/client/client.query.route";
import { workOrderMutationRouter } from "./routers/work-order/work-mutation.mutation.route";
import { workOrderQueryRouter } from "./routers/work-order/work-order.query.route";
import { workOrderSiteQueryRouter } from "./routers/work-order-site/work-order-site.query.route";
import { workOrderSiteMutationRouter } from "./routers/work-order-site/work-order-site.mutation.route";
import { proposalMutationRouter } from "./routers/proposal/proposal.mutation.route";
import { proposalQueryRouter } from "./routers/proposal/proposal.query.route";
import { contractorQueryRouter } from "./routers/contractor/contractor.query.route";
import { contractorMutationRouter } from "./routers/contractor/contractor.mutation.route";
import { expenseQueryRouter } from "./routers/expense/expense.query.route";
import { expenseMutationRouter } from "./routers/expense/expense.mutation.route";
import { sharePointQueryRouter } from "./routers/sharepoint/sharepoint.query.route";
import { sharePointMutationRouter } from "./routers/sharepoint/sharepoint.mutation.route";
import { publicProcedure } from "./middleware";

export const appRouter = router({

  default: publicProcedure.query(() => {
    return { message: "Working" };
  }),

  authQuery: authQueryRouter,
  authMutation: authMutationRouter,

  userMutation: userMutationRouter,
  userQuery: userQueryRouter,

  officeMutation: officeMutationRouter,
  officeQuery: officeQueryRouter,

  siteMutation: siteMutationRouter,
  siteQuery: siteQueryRouter,

  clientMutation: clientMutationRouter,
  clientQuery: clientQueryRouter,

  workOrderMutation: workOrderMutationRouter,
  workOrderQuery: workOrderQueryRouter,

  workOrderSiteQuery: workOrderSiteQueryRouter,
  workOrderSiteMutation: workOrderSiteMutationRouter,

  proposalMutation: proposalMutationRouter,
  proposalQuery: proposalQueryRouter,

  contractorQuery: contractorQueryRouter,
  contractorMutation: contractorMutationRouter,

  expenseQuery: expenseQueryRouter,
  expenseMutation: expenseMutationRouter,

  sharePointQuery: sharePointQueryRouter,
  sharePointMutation: sharePointMutationRouter,
});

export type AppRouter = typeof appRouter;

export type {
  TrpcContext,
  TrpcUser,
  TrpcAuthenticatedContext,
  TrpcAppEnv,
} from "./context";

export type { Database } from "@pkg/db";

export {
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  managerProcedure,
  operatorProcedure,
  createRoleProtectedProcedure,
  createMultiRoleProcedure,
  hasRole,
  hasAnyRole,
  USER_ROLES,
} from "./middleware";

export type { UserRole } from "./middleware";

export * from "./validation";

export * from "./schemas";

export * from "./errors";

export * from "@pkg/schema";

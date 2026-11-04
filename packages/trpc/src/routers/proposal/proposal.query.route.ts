import { and, count, desc, eq, inArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessClient,
  assertCanAccessProposal,
  getAccessScope,
  proposalIdsVisibleToScope,
  type AccessScope,
} from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { proposalSchemas } from "@pkg/schema";
import { USER_ROLES } from "../../authorization";
import { batchEffectiveWorkOrderStatuses } from "../work-order/batch-effective-work-order-status";

const { proposalTable, workOrderTable } = schema;

async function applyProposalScopeForClient(
  scope: AccessScope,
  db: Parameters<typeof proposalIdsVisibleToScope>[0],
  baseCond: ReturnType<typeof eq>,
) {
  if (scope.kind !== "restricted") {
    return { clientCond: baseCond, workOrderJoinOn: eq(workOrderTable.proposal_id, proposalTable.id) };
  }
  if (scope.ui === "site_only") {
    return {
      clientCond: and(baseCond, eq(proposalTable.id, -1))!,
      workOrderJoinOn: eq(workOrderTable.proposal_id, proposalTable.id),
    };
  }
  if (scope.ui === "office" && scope.officeIds.length > 0) {
    return {
      clientCond: and(
        baseCond,
        inArray(proposalTable.office_id, scope.officeIds),
      )!,
      workOrderJoinOn: and(
        eq(workOrderTable.proposal_id, proposalTable.id),
        inArray(workOrderTable.office_id, scope.officeIds),
      )!,
    };
  }
  const pids = (await proposalIdsVisibleToScope(db, scope)) ?? [];
  const scopeFilter =
    pids.length > 0
      ? inArray(proposalTable.id, pids)
      : eq(proposalTable.id, -1);
  return {
    clientCond: and(baseCond, scopeFilter)!,
    workOrderJoinOn: eq(workOrderTable.proposal_id, proposalTable.id),
  };
}

export const proposalQueryRouter = router({
  getProposalsByClient: protectedProcedure
    .input(proposalSchemas.getProposalsByClientSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { client_id, limit } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessClient(ctx.db, scope, client_id);

          const { clientCond, workOrderJoinOn } =
            await applyProposalScopeForClient(
              scope,
              ctx.db,
              eq(proposalTable.client_id, client_id),
            );

          const [totalResult] = await ctx.db
            .select({ count: count() })
            .from(proposalTable)
            .where(clientCond);
          const total = totalResult?.count ?? 0;

          const baseQuery = ctx.db
            .select({ proposal: proposalTable, workOrder: workOrderTable })
            .from(proposalTable)
            .where(clientCond)
            .leftJoin(workOrderTable, workOrderJoinOn)
            .orderBy(desc(proposalTable.created_at))
            .$dynamic();

          const rows = limit ? await baseQuery.limit(limit) : await baseQuery;

          // A work order completes once its schedule of rates is used up, so
          // send the status the work order pages show, not the stored one.
          const effectiveStatuses = await batchEffectiveWorkOrderStatuses(
            ctx.db,
            scope,
            rows.flatMap(({ workOrder }) =>
              workOrder
                ? [
                    {
                      id: workOrder.id,
                      office_id: workOrder.office_id,
                      status: workOrder.status,
                    },
                  ]
                : [],
            ),
          );

          const proposals = rows.map((row) => ({
            ...row,
            workOrder: row.workOrder && {
              ...row.workOrder,
              status:
                effectiveStatuses.get(row.workOrder.id) ?? row.workOrder.status,
            },
          }));

          return { proposals, total };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching proposals");
        }
      }),
    ),

  getProposalById: protectedProcedure
    .input(proposalSchemas.getProposalByIdSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { proposal_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessProposal(ctx.db, scope, proposal_id);

          const { clientCond: proposalWhere, workOrderJoinOn } =
            await applyProposalScopeForClient(
              scope,
              ctx.db,
              eq(proposalTable.id, proposal_id),
            );

          const result = await ctx.db
            .select({ proposal: proposalTable, workOrder: workOrderTable })
            .from(proposalTable)
            .where(proposalWhere)
            .leftJoin(workOrderTable, workOrderJoinOn)
            .limit(1);

          if (!result.length) {
            return null;
          }

          const row = result[0]!;

          const canManage = ctx.user!.role === USER_ROLES.ADMIN;

          return { ...row, canManage };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching proposal details");
        }
      }),
    ),
});

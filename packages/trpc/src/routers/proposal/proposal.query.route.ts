import { and, desc, eq, inArray, like, or } from "drizzle-orm";
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
import { escapeLike } from "../../helper/escape-like";
import { batchEffectiveWorkOrderStatuses } from "../work-order/batch-effective-work-order-status";

const { proposalTable, workOrderTable } = schema;

type WorkOrderGroup = "none" | "pending" | "completed" | "cancelled";

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
        const { client_id, limit, workOrder: workOrderFilter } = input;
        const page = input.cursor ?? 1;

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

          const search = input.search
            ? `%${escapeLike(input.search)}%`
            : undefined;
          const conditions = and(
            clientCond,
            search
              ? or(
                  like(proposalTable.code, search),
                  like(proposalTable.title, search),
                  like(workOrderTable.code, search),
                  like(workOrderTable.title, search),
                )
              : undefined,
            input.proposalStatus !== "all"
              ? eq(proposalTable.status, input.proposalStatus)
              : undefined,
            input.process !== "all"
              ? eq(workOrderTable.process_type, input.process)
              : undefined,
          );
          const newestFirst = [
            desc(proposalTable.created_at),
            desc(proposalTable.id),
          ];

          // Every match, light: a work order's status is worked out from
          // its schedule of rates, not stored, so it's grouped here.
          const candidates = await ctx.db
            .select({
              id: proposalTable.id,
              workOrderId: workOrderTable.id,
              workOrderOfficeId: workOrderTable.office_id,
              workOrderStatus: workOrderTable.status,
            })
            .from(proposalTable)
            .leftJoin(workOrderTable, workOrderJoinOn)
            .where(conditions)
            .orderBy(...newestFirst);

          const effectiveStatuses = await batchEffectiveWorkOrderStatuses(
            ctx.db,
            scope,
            candidates.flatMap((row) =>
              row.workOrderId == null
                ? []
                : [
                    {
                      id: row.workOrderId,
                      office_id: row.workOrderOfficeId,
                      status: String(row.workOrderStatus),
                    },
                  ],
            ),
          );

          const groupOf = (row: (typeof candidates)[number]): WorkOrderGroup =>
            row.workOrderId == null
              ? "none"
              : (effectiveStatuses.get(row.workOrderId) ??
                row.workOrderStatus ??
                "pending");

          // How many rows each work order tab would list.
          const counts = {
            all: candidates.length,
            none: 0,
            pending: 0,
            completed: 0,
            cancelled: 0,
          };
          for (const row of candidates) counts[groupOf(row)] += 1;

          const matching =
            workOrderFilter === "all"
              ? candidates
              : candidates.filter((row) => groupOf(row) === workOrderFilter);
          const total = matching.length;
          const offset = (page - 1) * limit;
          const pageIds = matching
            .slice(offset, offset + limit)
            .map((row) => row.id);

          // Full rows for this page only.
          const rows =
            pageIds.length === 0
              ? []
              : await ctx.db
                  .select({ proposal: proposalTable, workOrder: workOrderTable })
                  .from(proposalTable)
                  .leftJoin(workOrderTable, workOrderJoinOn)
                  .where(and(conditions, inArray(proposalTable.id, pageIds)))
                  .orderBy(...newestFirst);

          // Send the status the work order pages show, not the stored one.
          const proposals = rows.map((row) => ({
            ...row,
            workOrder: row.workOrder && {
              ...row.workOrder,
              status:
                effectiveStatuses.get(row.workOrder.id) ?? row.workOrder.status,
            },
          }));

          return {
            proposals,
            counts,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasMore: offset + pageIds.length < total,
            },
          };
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

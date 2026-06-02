import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";
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
import { escapeLike } from "../../helper/escape-like";
import { USER_ROLES } from "../../authorization";

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

          const proposals = limit
            ? await baseQuery.limit(limit)
            : await baseQuery;

          return { proposals, total };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching proposals");
        }
      }),
    ),

  getProposalsByClientPaginated: protectedProcedure
    .input(proposalSchemas.getProposalsByClientPaginatedSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { client_id, page, limit, searchQuery } = input;

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessClient(ctx.db, scope, client_id);

        const scoped = await applyProposalScopeForClient(
          scope,
          ctx.db,
          eq(proposalTable.client_id, client_id),
        );
        let conditions: any = scoped.clientCond;
        const { workOrderJoinOn: workOrderJoinOnPaginated } = scoped;

        if (searchQuery && searchQuery.trim() !== "") {
          conditions = and(
            conditions,
            or(
              like(proposalTable.code, `%${escapeLike(searchQuery)}%`),
              like(proposalTable.title, `%${escapeLike(searchQuery)}%`),
            ),
          );
        }

        try {
          const [totalResult] = await ctx.db
            .select({ count: count() })
            .from(proposalTable)
            .where(conditions);

          const total = totalResult?.count ?? 0;

          if (total === 0) {
            return {
              proposals: [],
              pagination: {
                page,
                limit,
                total,
                hasMore: false,
                totalPages: 0,
              },
            };
          }

          const offset = (page - 1) * limit;

          const proposals = await ctx.db
            .select({ proposal: proposalTable, workOrder: workOrderTable })
            .from(proposalTable)
            .leftJoin(workOrderTable, workOrderJoinOnPaginated)
            .where(conditions)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(proposalTable.created_at));

          const totalPages = Math.ceil(total / limit);
          const hasMore = offset + proposals.length < total;

          return {
            proposals,
            pagination: {
              page,
              limit,
              total,
              hasMore,
              totalPages,
            },
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching paginated proposals");
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

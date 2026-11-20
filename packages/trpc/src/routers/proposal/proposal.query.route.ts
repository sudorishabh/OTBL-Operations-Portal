import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lt,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
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
import {
  batchEffectiveWorkOrderStatuses,
  sorFullyConsumedSql,
} from "../work-order/batch-effective-work-order-status";

const { proposalTable, workOrderTable } = schema;

type WorkOrderGroup = "none" | "pending" | "completed" | "cancelled";

const DAY_MS = 24 * 60 * 60 * 1000;

// Submission dates are saved from a YYYY-MM-DD as that day's UTC midnight,
// so a day's range is read the same way.
const startOfDay = (day: string) => new Date(day);
const startOfNextDay = (day: string) => new Date(Date.parse(day) + DAY_MS);

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
                  like(workOrderTable.purchase_order_code, search),
                )
              : undefined,
            input.proposalStatus !== "all"
              ? eq(proposalTable.status, input.proposalStatus)
              : undefined,
            input.process !== "all"
              ? eq(workOrderTable.process_type, input.process)
              : undefined,
            input.submittedFrom
              ? gte(
                  proposalTable.proposal_submission_date,
                  startOfDay(input.submittedFrom),
                )
              : undefined,
            input.submittedTo
              ? lt(
                  proposalTable.proposal_submission_date,
                  startOfNextDay(input.submittedTo),
                )
              : undefined,
          );
          const newestFirst = [
            desc(proposalTable.created_at),
            desc(proposalTable.id),
          ];

          // A work order's status is worked out from its schedule of rates,
          // not stored, so the database groups the rows by it: none, its
          // stored completed or cancelled, or completed once its schedule of
          // rates is used up, else pending.
          const hasNoWorkOrder = isNull(workOrderTable.id);
          const isCancelled = eq(workOrderTable.status, "cancelled");
          const isCompleted = or(
            eq(workOrderTable.status, "completed"),
            and(eq(workOrderTable.status, "pending"), sorFullyConsumedSql()),
          )!;
          const isPending = and(
            eq(workOrderTable.status, "pending"),
            not(sorFullyConsumedSql()),
          )!;
          const groupWhere: Record<WorkOrderGroup | "all", SQL | undefined> = {
            all: undefined,
            none: hasNoWorkOrder,
            pending: isPending,
            completed: isCompleted,
            cancelled: isCancelled,
          };
          const where = and(conditions, groupWhere[workOrderFilter]);
          const tally = (condition: SQL) =>
            sql<string>`coalesce(sum(case when ${condition} then 1 else 0 end), 0)`;

          const [[countRow], [totalRow]] = await Promise.all([
            // How many rows each work order tab would list. Cancelled work
            // orders have no tab, so they count towards "all" only.
            ctx.db
              .select({
                all: count(),
                none: tally(hasNoWorkOrder),
                pending: tally(isPending),
                completed: tally(isCompleted),
              })
              .from(proposalTable)
              .leftJoin(workOrderTable, workOrderJoinOn)
              .where(conditions),
            ctx.db
              .select({ count: count() })
              .from(proposalTable)
              .leftJoin(workOrderTable, workOrderJoinOn)
              .where(where),
          ]);
          const counts = {
            all: Number(countRow?.all ?? 0),
            none: Number(countRow?.none ?? 0),
            pending: Number(countRow?.pending ?? 0),
            completed: Number(countRow?.completed ?? 0),
          };
          const total = Number(totalRow?.count ?? 0);
          const offset = (page - 1) * limit;

          // Full rows for this page only.
          const rows = await ctx.db
            .select({ proposal: proposalTable, workOrder: workOrderTable })
            .from(proposalTable)
            .leftJoin(workOrderTable, workOrderJoinOn)
            .where(where)
            .orderBy(...newestFirst)
            .limit(limit)
            .offset(offset);

          const effectiveStatuses = await batchEffectiveWorkOrderStatuses(
            ctx.db,
            scope,
            rows.flatMap((row) =>
              row.workOrder == null
                ? []
                : [
                    {
                      id: row.workOrder.id,
                      office_id: row.workOrder.office_id,
                      status: String(row.workOrder.status),
                    },
                  ],
            ),
          );

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
              hasMore: offset + rows.length < total,
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

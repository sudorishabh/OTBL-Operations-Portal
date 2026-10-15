import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  like,
  or,
} from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessOffice,
  getAccessScope,
  resolveVisibleOfficeIds,
} from "../../access-scope";
import { fromDatabaseError, notFound } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { z } from "zod";

const { contractorTable, officeTable } = schema;

export const contractorQueryRouter = router({
  // The vendors of every office the user can see, for the Vendors page.
  getVendors: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        office_id: z.number().positive().optional(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { page, limit, search, status, office_id } = input;

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );

        // Site operators see no vendors, as with offices.
        const visibleOfficeIds =
          scope.kind === "restricted" && scope.ui !== "office"
            ? []
            : await resolveVisibleOfficeIds(ctx.db, scope);

        if (visibleOfficeIds && visibleOfficeIds.length === 0) {
          return {
            vendors: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          };
        }

        const term = search?.trim() ? `%${escapeLike(search.trim())}%` : null;
        const where = and(
          visibleOfficeIds
            ? inArray(contractorTable.office_id, visibleOfficeIds)
            : undefined,
          office_id ? eq(contractorTable.office_id, office_id) : undefined,
          status ? eq(contractorTable.status, status) : undefined,
          term
            ? or(
                like(contractorTable.name, term),
                like(contractorTable.contact_number, term),
                like(contractorTable.email, term),
                like(contractorTable.gst_number, term),
              )
            : undefined,
        );

        try {
          const [totalRow] = await ctx.db
            .select({ total: count() })
            .from(contractorTable)
            .where(where);
          const total = totalRow?.total ?? 0;

          const vendors = await ctx.db
            .select({
              ...getTableColumns(contractorTable),
              office_name: officeTable.name,
            })
            .from(contractorTable)
            .leftJoin(
              officeTable,
              eq(contractorTable.office_id, officeTable.id),
            )
            .where(where)
            .orderBy(asc(contractorTable.name))
            .limit(limit)
            .offset((page - 1) * limit);

          return {
            vendors,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasMore: page * limit < total,
            },
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching vendors");
        }
      }),
    ),

  getContractors: protectedProcedure
    .input(
      z.object({
        office_id: z.number().positive(),
        search: z.string().optional(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { office_id, search } = input;

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessOffice(ctx.db, scope, office_id);

        try {
          const whereClause = search
            ? and(
                eq(contractorTable.office_id, office_id),
                like(contractorTable.name, `%${escapeLike(search)}%`),
              )
            : eq(contractorTable.office_id, office_id);

          const contractors = await ctx.db
            .select()
            .from(contractorTable)
            .where(whereClause)
            .orderBy(desc(contractorTable.created_at));

          return { contractors };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching contractors");
        }
      }),
    ),

  getContractor: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        try {
          const [contractor] = await ctx.db
            .select()
            .from(contractorTable)
            .where(eq(contractorTable.id, input.id));

          if (!contractor) {
            throw notFound("Contractor", input.id);
          }

          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessOffice(ctx.db, scope, contractor.office_id);

          return { contractor };
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error)
            throw error;
          throw fromDatabaseError(error, "Fetching contractor");
        }
      }),
    ),
});

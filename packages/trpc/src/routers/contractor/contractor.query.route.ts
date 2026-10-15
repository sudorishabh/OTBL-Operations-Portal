import { and, asc, count, eq, like, or } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { fromDatabaseError, notFound } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { z } from "zod";
import { assertCanUseVendors, canUseVendors } from "./vendor-access";

const { contractorTable } = schema;

const searchWhere = (search: string | undefined) => {
  const term = search?.trim() ? `%${escapeLike(search.trim())}%` : null;
  return term
    ? or(
        like(contractorTable.name, term),
        like(contractorTable.contact_number, term),
        like(contractorTable.email, term),
        like(contractorTable.gst_number, term),
      )
    : undefined;
};

export const contractorQueryRouter = router({
  // Every vendor, paginated, for the Vendors page.
  getVendors: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { page, limit, search, status } = input;

        if (!(await canUseVendors(ctx))) {
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

        const where = and(
          status ? eq(contractorTable.status, status) : undefined,
          searchWhere(search),
        );

        try {
          const [totalRow] = await ctx.db
            .select({ total: count() })
            .from(contractorTable)
            .where(where);
          const total = totalRow?.total ?? 0;

          const vendors = await ctx.db
            .select()
            .from(contractorTable)
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

  // Every vendor by name, for pickers.
  getContractors: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        await assertCanUseVendors(ctx);

        try {
          const contractors = await ctx.db
            .select()
            .from(contractorTable)
            .where(searchWhere(input.search))
            .orderBy(asc(contractorTable.name));

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
        await assertCanUseVendors(ctx);

        try {
          const [contractor] = await ctx.db
            .select()
            .from(contractorTable)
            .where(eq(contractorTable.id, input.id));

          if (!contractor) {
            throw notFound("Contractor", input.id);
          }

          return { contractor };
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error)
            throw error;
          throw fromDatabaseError(error, "Fetching contractor");
        }
      }),
    ),
});

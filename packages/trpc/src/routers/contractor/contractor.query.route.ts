import { eq, desc, like, and } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertCanAccessOffice, getAccessScope } from "../../access-scope";
import { fromDatabaseError, notFound } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { z } from "zod";

const { contractorTable } = schema;

export const contractorQueryRouter = router({
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
                like(contractorTable.name, `%${search}%`),
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
          if (error && typeof error === "object" && "errorCode" in error) throw error;
          throw fromDatabaseError(error, "Fetching contractor");
        }
      }),
    ),
});

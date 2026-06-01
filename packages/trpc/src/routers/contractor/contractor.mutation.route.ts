import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertCanAccessOffice, getAccessScope } from "../../access-scope";
import { fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { z } from "zod";

const { contractorTable } = schema;

const createContractorSchema = z.object({
  office_id: z.number().positive(),
  name: z.string().min(1, "Name is required").max(255),
  contact_number: z.string().max(15).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  gst_number: z.string().max(15).optional(),
  pan_number: z.string().max(10).optional(),
});

const updateContractorSchema = z.object({
  id: z.number().positive(),
  name: z.string().min(1).max(255).optional(),
  contact_number: z.string().max(15).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  gst_number: z.string().max(15).optional(),
  pan_number: z.string().max(10).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const contractorMutationRouter = router({
  createContractor: protectedProcedure
    .input(createContractorSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessOffice(ctx.db, scope, input.office_id);

        try {
          const [created] = await ctx.db
            .insert(contractorTable)
            .values({
              office_id: input.office_id,
              name: input.name,
              contact_number: input.contact_number ?? null,
              email: input.email || null,
              address: input.address ?? null,
              gst_number: input.gst_number ?? null,
              pan_number: input.pan_number ?? null,
            })
            .$returningId();

          if (!created) {
            throw notFound("Contractor", undefined, {
              userMessage: "Failed to create contractor. Please try again.",
            });
          }

          return { success: true, id: created.id };
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error) throw error;
          throw fromDatabaseError(error, "Creating contractor");
        }
      }),
    ),

  updateContractor: protectedProcedure
    .input(updateContractorSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id, ...updateData } = input;

        const existing = await ctx.db
          .select()
          .from(contractorTable)
          .where(eq(contractorTable.id, id));

        if (existing.length === 0) {
          throw notFound("Contractor", id);
        }

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessOffice(ctx.db, scope, existing[0]!.office_id);

        try {
          await ctx.db
            .update(contractorTable)
            .set({
              ...updateData,
              email: updateData.email || null,
            })
            .where(eq(contractorTable.id, id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating contractor");
        }
      }),
    ),

  deleteContractor: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const existing = await ctx.db
          .select()
          .from(contractorTable)
          .where(eq(contractorTable.id, input.id));

        if (existing.length === 0) {
          throw notFound("Contractor", input.id);
        }

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessOffice(ctx.db, scope, existing[0]!.office_id);

        try {
          await ctx.db
            .delete(contractorTable)
            .where(eq(contractorTable.id, input.id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting contractor");
        }
      }),
    ),
});

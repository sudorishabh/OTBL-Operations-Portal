import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { vendorSchemas } from "@pkg/schema";
import { z } from "zod";
import { assertCanManageVendors, assertCanUseVendors } from "./vendor-access";

const { contractorTable } = schema;

// Optional text: blank clears it, and a field left out stays as it is.
const optionalText = (value: string | undefined) =>
  value === undefined ? undefined : value.trim() || null;

export const contractorMutationRouter = router({
  createContractor: protectedProcedure
    .input(vendorSchemas.createVendorSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertCanUseVendors(ctx);

        try {
          const [created] = await ctx.db
            .insert(contractorTable)
            .values({
              name: input.name.trim(),
              contact_number: optionalText(input.contact_number) ?? null,
              email: optionalText(input.email) ?? null,
              address: optionalText(input.address) ?? null,
              gst_number: optionalText(input.gst_number) ?? null,
              pan_number: optionalText(input.pan_number) ?? null,
            })
            .$returningId();

          if (!created) {
            throw notFound("Contractor", undefined, {
              userMessage: "Failed to create contractor. Please try again.",
            });
          }

          return { success: true, id: created.id };
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error)
            throw error;
          throw fromDatabaseError(error, "Creating contractor");
        }
      }),
    ),

  updateContractor: protectedProcedure
    .input(vendorSchemas.updateVendorSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id, name, status } = input;
        assertCanManageVendors(ctx);

        const existing = await ctx.db
          .select()
          .from(contractorTable)
          .where(eq(contractorTable.id, id));

        if (existing.length === 0) {
          throw notFound("Contractor", id);
        }

        try {
          await ctx.db
            .update(contractorTable)
            .set({
              name: name?.trim(),
              status,
              contact_number: optionalText(input.contact_number),
              email: optionalText(input.email),
              address: optionalText(input.address),
              gst_number: optionalText(input.gst_number),
              pan_number: optionalText(input.pan_number),
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
        assertCanManageVendors(ctx);

        const existing = await ctx.db
          .select()
          .from(contractorTable)
          .where(eq(contractorTable.id, input.id));

        if (existing.length === 0) {
          throw notFound("Contractor", input.id);
        }

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

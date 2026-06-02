import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../middleware";
import { notFound, fromDatabaseError } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { assertOfficeManager } from "../../helper/office-permissions";
import { siteSchemas } from "@pkg/schema";

const { siteTable } = schema;

export const siteMutationRouter = router({
  createSite: protectedProcedure.input(siteSchemas.createSiteSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      await assertOfficeManager(ctx, input.office_id);

      try {
        const [createdSite] = await ctx.db
          .insert(siteTable)
          .values(input)
          .$returningId();

        if (!createdSite) {
          throw notFound("Site", undefined, {
            userMessage: "Failed to create site. Please try again.",
          });
        }

        return { success: true, id: createdSite.id };
      } catch (error) {
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Creating site");
      }
    }),
  ),

  updateSite: protectedProcedure.input(siteSchemas.updateSiteSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const existingSite = await ctx.db
        .select()
        .from(siteTable)
        .where(eq(siteTable.id, input.siteId));

      if (existingSite.length === 0) {
        throw notFound("Site", input.siteId);
      }

      await assertOfficeManager(ctx, existingSite[0]!.office_id);

      try {
        await ctx.db
          .update(siteTable)
          .set(input)
          .where(eq(siteTable.id, input.siteId));

        return { success: true };
      } catch (error) {
        throw fromDatabaseError(error, "Updating site");
      }
    }),
  ),
});

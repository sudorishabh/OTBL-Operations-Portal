import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { managerProcedure, protectedProcedure } from "../../middleware";
import { notFound, fromDatabaseError } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { assertOfficeManager } from "../../helper/office-permissions";
import { siteSchemas } from "@pkg/schema";

const { siteTable } = schema;

export const siteMutationRouter = router({
  // Office-manager-scoped: only an admin or the manager of this site's office
  // may create a site in it. Office operators are read-only and cannot create
  // sites. (Was a global managerProcedure, which let any global manager create
  // a site in any office regardless of which office they actually manage.)
  //
  // Operators are NOT assigned here — Site Operators are pinned per
  // work-order-site (setWorkOrderSiteOperators), not to the master site.
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
        // Re-throw AppError instances
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Creating site");
      }
    }),
  ),

  updateSite: managerProcedure.input(siteSchemas.updateSiteSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      // Check if site exists
      const existingSite = await ctx.db
        .select()
        .from(siteTable)
        .where(eq(siteTable.id, input.siteId));

      if (existingSite.length === 0) {
        throw notFound("Site", input.siteId);
      }

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

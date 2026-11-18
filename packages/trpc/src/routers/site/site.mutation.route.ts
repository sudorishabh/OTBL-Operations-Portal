import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../middleware";
import { notFound, fromDatabaseError } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { assertOfficeManager } from "../../helper/office-permissions";
import { siteSchemas } from "@pkg/schema";
import { CODE_PREFIX } from "@pkg/utils";
import { nextCode } from "../../helper/record-code";

const { siteTable } = schema;

export const siteMutationRouter = router({
  createSite: protectedProcedure.input(siteSchemas.createSiteSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      await assertOfficeManager(ctx, input.office_id);

      try {
        const [createdSite] = await ctx.db.transaction(async (tx) => {
          const code = await nextCode(tx, siteTable, CODE_PREFIX.SITE);
          return tx
            .insert(siteTable)
            .values({ ...input, code })
            .$returningId();
        });

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

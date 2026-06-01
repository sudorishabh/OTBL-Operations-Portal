import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { managerProcedure, protectedProcedure } from "../../middleware";
import {
  alreadyExists,
  notFound,
  fromDatabaseError,
  validationError,
} from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { assertOfficeManager } from "../../helper/office-permissions";
import { siteSchemas } from "@pkg/schema";
import { constants } from "@pkg/utils";

const { ROLES } = constants;
const { siteTable, userTable, siteUserTable } = schema;

export const siteMutationRouter = router({
  // Office-manager-scoped: only an admin or the manager of this site's office
  // may create a site in it. Office operators are read-only and cannot create
  // sites. (Was a global managerProcedure, which let any global manager create
  // a site in any office regardless of which office they actually manage.)
  createSite: protectedProcedure.input(siteSchemas.createSiteSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { operator_ids, ...siteData } = input;

      await assertOfficeManager(ctx, input.office_id);

      let siteId: number | undefined;

      try {
        await ctx.db.transaction(async (tx) => {
          const [createdSite] = await tx
            .insert(siteTable)
            .values(siteData)
            .$returningId();

          if (!createdSite) {
            throw notFound("Site", undefined, {
              userMessage: "Failed to create site. Please try again.",
            });
          }

          siteId = createdSite.id;

          if (operator_ids && operator_ids.length > 0) {
            const users = await tx
              .select()
              .from(userTable)
              .where(inArray(userTable.id, operator_ids));

            if (users.length !== operator_ids.length) {
              throw notFound("Operator", undefined, {
                userMessage: "One or more selected operators don't exist.",
              });
            }

            // Office/site split: only Site Operators may be assigned to a site,
            // and they go into site_users ONLY — no office_users row. The old
            // "a site's operators must also be office members" invariant has
            // been replaced by the explicit site_operator global role.
            const notSiteOperators = users.filter(
              (u: { role: string }) => u.role !== ROLES.SITE_OPERATOR,
            );
            if (notSiteOperators.length > 0) {
              throw validationError(
                "Only Site Operators can be assigned to a site",
                notSiteOperators.map((u: { name: string }) => ({
                  field: "operator_ids",
                  message: `${u.name} is not a Site Operator.`,
                })),
                {
                  userMessage:
                    "Only Site Operators can be assigned to a site. Office Operators belong to offices.",
                },
              );
            }

            const operatorValues = operator_ids.map((operatorId: number) => ({
              user_id: operatorId,
              site_id: createdSite.id,
              office_id: input.office_id,
            }));

            await tx.insert(siteUserTable).values(operatorValues);
          }
        });

        return { success: true, id: siteId! };
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

  assignUserToSite: protectedProcedure
    .input(siteSchemas.assignUserToSiteSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { site_id, user_id } = input;

        const [site] = await ctx.db
          .select()
          .from(siteTable)
          .where(eq(siteTable.id, site_id))
          .limit(1);

        if (!site) {
          throw notFound("Site", site_id);
        }

        // Only an admin or the manager of the site's office may assign
        // operators to it.
        await assertOfficeManager(ctx, site.office_id);

        const [user] = await ctx.db
          .select()
          .from(userTable)
          .where(eq(userTable.id, user_id))
          .limit(1);

        if (!user) {
          throw notFound("User", user_id, {
            userMessage: "The selected user doesn't exist.",
          });
        }

        // Office/site split: only a Site Operator may be assigned to a site.
        // (Previously required office membership; the site ⊆ office invariant
        // has been replaced by the explicit site_operator global role.)
        if (user.role !== ROLES.SITE_OPERATOR) {
          throw validationError(
            `User ${user_id} is not a Site Operator`,
            undefined,
            {
              userMessage: "Only Site Operators can be assigned to a site.",
            },
          );
        }

        const [existing] = await ctx.db
          .select({ id: siteUserTable.id })
          .from(siteUserTable)
          .where(
            and(
              eq(siteUserTable.site_id, site_id),
              eq(siteUserTable.user_id, user_id),
            ),
          )
          .limit(1);

        if (existing) {
          throw alreadyExists("Site assignment", undefined, {
            userMessage: "This site operator is already assigned to this site.",
          });
        }

        try {
          await ctx.db.insert(siteUserTable).values({
            site_id,
            user_id,
            office_id: site.office_id,
          });
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Assigning user to site");
        }
      }),
    ),

  removeUserFromSite: protectedProcedure
    .input(siteSchemas.removeUserFromSiteSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { site_id, user_id } = input;

        const [site] = await ctx.db
          .select({ office_id: siteTable.office_id })
          .from(siteTable)
          .where(eq(siteTable.id, site_id))
          .limit(1);

        if (!site) {
          throw notFound("Site", site_id);
        }

        // Only an admin or the manager of the site's office may remove
        // operators from it.
        await assertOfficeManager(ctx, site.office_id);

        const rows = await ctx.db
          .select({ id: siteUserTable.id })
          .from(siteUserTable)
          .where(
            and(
              eq(siteUserTable.site_id, site_id),
              eq(siteUserTable.user_id, user_id),
            ),
          );

        if (!rows[0]) {
          throw notFound("Site assignment", undefined, {
            userMessage: "This user is not assigned to this site.",
          });
        }

        try {
          await ctx.db
            .delete(siteUserTable)
            .where(eq(siteUserTable.id, rows[0].id));
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Removing user from site");
        }
      }),
    ),
});

import { and, count, desc, eq, like, or } from "drizzle-orm";
import { schema } from "@pkg/db";
import { Site } from "@pkg/db/types";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessOffice,
  getAccessScope,
} from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { siteSchemas } from "@pkg/schema";
import { escapeLike } from "../../helper/escape-like";

const { siteTable } = schema;

export const siteQueryRouter = router({
  get6SitesByOfficeId: protectedProcedure
    .input(siteSchemas.get6SitesByOfficeIdSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { office_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessOffice(ctx.db, scope, office_id);

          const sites: Site[] = await ctx.db
            .select()
            .from(siteTable)
            .where(eq(siteTable.office_id, office_id))
            .orderBy(desc(siteTable.created_at));

          return sites;
        } catch (error) {
          throw fromDatabaseError(error, "Fetching sites by office");
        }
      }),
    ),

  getSitesByOfficeId: protectedProcedure
    .input(siteSchemas.getAllSitesByOfficeIdSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { office_id, page, limit, searchQuery, status } = input;
        const offset = (page - 1) * limit;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessOffice(ctx.db, scope, office_id);

          const whereClause = and(
            eq(siteTable.office_id, office_id),
            searchQuery && searchQuery.trim() !== ""
              ? or(
                  like(siteTable.name, `%${escapeLike(searchQuery)}%`),
                  like(siteTable.address, `%${escapeLike(searchQuery)}%`),
                  like(siteTable.city, `%${escapeLike(searchQuery)}%`),
                )
              : undefined,
            status && status !== "all"
              ? eq(siteTable.status, status as any)
              : undefined,
          );

          const [countResult] = await ctx.db
            .select({ count: count(siteTable.id) })
            .from(siteTable)
            .where(whereClause);

          const totalCount = countResult?.count ?? 0;

          const sites: Site[] = await ctx.db
            .select()
            .from(siteTable)
            .where(whereClause)
            .orderBy(desc(siteTable.created_at))
            .limit(limit)
            .offset(offset);

          return {
            sites,
            totalCount,
            hasMore: offset + sites.length < totalCount,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching paginated sites");
        }
      }),
    ),

  getSite: protectedProcedure.input(siteSchemas.getSiteSchema).query(
    handleQuery(async ({ input, ctx }) => {
      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );

        const [site] = await ctx.db
          .select()
          .from(siteTable)
          .where(eq(siteTable.id, input.siteId))
          .limit(1);

        if (site) {
          await assertCanAccessOffice(ctx.db, scope, site.office_id);
        }

        return site;
      } catch (error) {
        throw fromDatabaseError(error, "Fetching site");
      }
    }),
  ),
});

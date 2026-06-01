import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  like,
  not,
  notExists,
  or,
} from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { z } from "zod";
import { hasAnyRole, hasRole } from "../../authorization";
import { notFound, fromDatabaseError } from "../../errors";
import { handleProtectedQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { userSchemas, userTypes } from "@pkg/schema";

const { userTable, officeTable, officeUserTable, siteTable, siteUserTable } =
  schema;
const { ROLES, STATUS } = constants;

export const userQueryRouter = router({
  me: protectedProcedure.query(
    handleProtectedQuery(async ({ ctx }) => {
      const userId = Number(ctx.user.sub);

      const [userData] = await ctx.db
        .select({
          id: userTable.id,
          name: userTable.name,
          email: userTable.email,
          contact_number: userTable.contact_number,
          role: userTable.role,
          status: userTable.status,
          created_at: userTable.created_at,
        })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .limit(1);

      if (!userData) {
        throw notFound("User", userId, {
          userMessage: "Your account could not be found. Please log in again.",
        });
      }

      return userData;
    }),
  ),

  getAllUser: protectedProcedure
    .use(hasRole(ROLES.ADMIN))
    .input(userSchemas.getAllUsersSchema)
    .query(
      handleProtectedQuery(async ({ input, ctx }) => {
        const { page, limit, searchQuery, role, status, userNamesOrder } =
          input;

        const offset = (page - 1) * limit;
        let userQuery = not(eq(userTable.role, ROLES.ADMIN));

        if (role && role !== "all") {
          userQuery = and(userQuery, eq(userTable.role, role as any)) ?? userQuery;
        }

        if (status && status !== "all") {
          userQuery = and(userQuery, eq(userTable.status, status)) ?? userQuery;
        }

        if (searchQuery && searchQuery.trim() !== "") {
          userQuery =
            and(
              userQuery,
              or(
                like(userTable.name, `%${escapeLike(searchQuery)}%`),
                like(userTable.email, `%${escapeLike(searchQuery)}%`),
                like(userTable.contact_number, `%${escapeLike(searchQuery)}%`),
              ),
            ) ?? userQuery;
        }

        const [totalResult] = await ctx.db
          .select({ count: count() })
          .from(userTable)
          .where(userQuery);

        const total = totalResult?.count || 0;

        if (total === 0) {
          return {
            users: [],
            pagination: {
              page,
              limit,
              total,
              hasMore: false,
              totalPages: 0,
            },
          };
        }

        let userOrder;
        switch (userNamesOrder) {
          case "asc":
            userOrder = asc(userTable.name);
            break;

          case "desc":
            userOrder = desc(userTable.name);
            break;

          case "latest":
            userOrder = desc(userTable.created_at);
            break;

          default:
            userOrder = asc(userTable.created_at);
            break;
        }

        const users = await ctx.db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            contact_number: userTable.contact_number,
            role: userTable.role,
            status: userTable.status,
            created_at: userTable.created_at,
          })
          .from(userTable)
          .where(userQuery)
          .limit(limit)
          .offset(offset)
          .orderBy(userOrder);

        // Fetch offices for each user with full office details
        // Fetch offices and sites in batch to avoid N+1 problem
        const userIds = users.map((u: any) => u.id);
        let allOffices: {
          userId: number;
          id: number;
          name: string;
          officeRole: string | null;
        }[] = [];
        let allSites: { userId: number; id: number; name: string }[] = [];

        if (userIds.length > 0) {
          allOffices = await ctx.db
            .select({
              userId: officeUserTable.user_id,
              id: officeTable.id,
              name: officeTable.name,
              officeRole: officeUserTable.role,
            })
            .from(officeUserTable)
            .innerJoin(
              officeTable,
              eq(officeUserTable.office_id, officeTable.id),
            )
            .where(inArray(officeUserTable.user_id, userIds));

          allSites = await ctx.db
            .select({
              userId: siteUserTable.user_id,
              id: siteTable.id,
              name: siteTable.name,
            })
            .from(siteUserTable)
            .innerJoin(siteTable, eq(siteUserTable.site_id, siteTable.id))
            .where(inArray(siteUserTable.user_id, userIds));
        }

        const usersWithOfficesAndSites = users.map((user: any) => {
          const userOffices = allOffices
            .filter((o) => o.userId === user.id)
            .map(({ userId, ...rest }) => ({ ...rest, type: "office" }));

          const userSites = allSites
            .filter((s) => s.userId === user.id)
            .map(({ userId, ...rest }) => ({ ...rest, type: "site" }));

          return {
            ...user,
            offices: userOffices,
            sites: userSites,
          };
        });

        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + users.length < total;

        return {
          users: usersWithOfficesAndSites,
          pagination: {
            page,
            limit,
            total,
            hasMore,
            totalPages,
          },
        };
      }),
    ),

  // Get user by ID
  getUserById: protectedProcedure
    .use(hasAnyRole([ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR]))
    .input(z.object({ id: z.number() }))
    .query(
      handleProtectedQuery(async ({ input, ctx }) => {
        const [user] = await ctx.db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            contact_number: userTable.contact_number,
            role: userTable.role,
            status: userTable.status,
            created_at: userTable.created_at,
          })
          .from(userTable)
          .where(eq(userTable.id, input.id))
          .limit(1);

        if (!user) {
          throw notFound("User", input.id);
        }

        return user;
      }),
    ),

  getUsersByRole: protectedProcedure
    .input(
      z.object({
        role: z.enum([
          ROLES.ADMIN,
          ROLES.MANAGER,
          ROLES.OPERATOR,
          ROLES.OFFICE_OPERATOR,
          ROLES.SITE_OPERATOR,
        ]),
        page: z.number().default(1),
        limit: z.number().default(100),
        search: z.string().optional().default(""),
        // When true, only users who do not yet belong to ANY office are
        // returned. Used by the create-site picker so already-assigned
        // operators aren't offered again.
        excludeOfficeMembers: z.boolean().optional().default(false),
      }),
    )
    .query(
      handleProtectedQuery(async ({ input, ctx }) => {
        const { page, limit, role, search, excludeOfficeMembers } = input;
        const offset = (page - 1) * limit;

        let condition = eq(userTable.role, role);

        if (search && search.trim() !== "") {
          condition =
            and(
              condition,
              or(
                like(userTable.name, `%${escapeLike(search)}%`),
                like(userTable.email, `%${escapeLike(search)}%`),
                like(userTable.contact_number, `%${escapeLike(search)}%`),
              ),
            ) ?? condition;
        }

        // Drop anyone already assigned to an office. Filtered in SQL (not
        // client-side) so the count and pagination below stay accurate.
        if (excludeOfficeMembers) {
          condition =
            and(
              condition,
              notExists(
                ctx.db
                  .select({ id: officeUserTable.id })
                  .from(officeUserTable)
                  .where(eq(officeUserTable.user_id, userTable.id)),
              ),
            ) ?? condition;
        }

        // Get total count first
        const [totalResult] = await ctx.db
          .select({ count: count() })
          .from(userTable)
          .where(condition);

        const total = totalResult?.count || 0;

        if (total === 0) {
          return {
            users: [],
            pagination: {
              page,
              limit,
              total,
              hasMore: false,
              totalPages: 0,
            },
          };
        }

        const users = await ctx.db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            contact_number: userTable.contact_number,
            role: userTable.role,
            status: userTable.status,
          })
          .from(userTable)
          .where(condition)
          .orderBy(asc(userTable.name))
          .limit(limit)
          .offset(offset);

        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + users.length < total;

        return {
          users,
          pagination: {
            page,
            limit,
            total,
            hasMore,
            totalPages,
          },
        };
      }),
    ),

  // Get 8 users from each role category
  getCategories8User: protectedProcedure.query(
    handleProtectedQuery(async ({ ctx }) => {
      const userInfoNeeded = {
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        contact_number: userTable.contact_number,
        status: userTable.status,
        created_at: userTable.created_at,
      };

      const fetchEightByRole = async (
        role: (typeof ROLES)[keyof typeof ROLES],
      ) => {
        try {
          return await ctx.db
            .select(userInfoNeeded)
            .from(userTable)
            .where(
              and(
                eq(userTable.role, role),
                eq(userTable.status, STATUS.ACTIVE),
                not(eq(userTable.role, ROLES.ADMIN)),
              ),
            )
            .orderBy(desc(userTable.created_at))
            .limit(8);
        } catch (error) {
          throw fromDatabaseError(error, `Fetching ${role} users`);
        }
      };

      const totalUserByRole = async (
        role: (typeof ROLES)[keyof typeof ROLES],
      ) => {
        try {
          return await ctx.db
            .select({ count: count() })
            .from(userTable)
            .where(
              and(
                not(eq(userTable.role, ROLES.ADMIN)),
                eq(userTable.role, role),
              ),
            );
        } catch (error) {
          throw fromDatabaseError(error, `Counting ${role} users`);
        }
      };

      const [
        managers,
        officeOperators,
        siteOperators,
        totalManagers,
        totalOfficeOperators,
        totalSiteOperators,
      ] = await Promise.all([
        fetchEightByRole(ROLES.MANAGER),
        fetchEightByRole(ROLES.OFFICE_OPERATOR),
        fetchEightByRole(ROLES.SITE_OPERATOR),
        totalUserByRole(ROLES.MANAGER),
        totalUserByRole(ROLES.OFFICE_OPERATOR),
        totalUserByRole(ROLES.SITE_OPERATOR),
      ]);

      return {
        managers,
        officeOperators,
        siteOperators,
        totalManagers: totalManagers[0]?.count,
        totalOfficeOperators: totalOfficeOperators[0]?.count,
        totalSiteOperators: totalSiteOperators[0]?.count,
      };
    }),
  ),
});

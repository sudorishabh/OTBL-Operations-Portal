import { and, eq, ne } from "drizzle-orm";
import { schema } from "@pkg/db";
import { USER_ROLES } from "@pkg/utils/auth";
import { CODE_PREFIX } from "@pkg/utils";
import { adminProcedure, protectedProcedure } from "../../middleware";
import { router } from "../../trpc";
import {
  notFound,
  alreadyExists,
  forbidden,
  validationError,
  fromDatabaseError,
} from "../../errors";
import { handleProtectedMutation } from "../../helper/typed-handler";
import { nextCode } from "../../helper/record-code";
import { fromAuthError } from "../../helper/auth-error";
import { userSchemas } from "@pkg/schema";

const { userTable, officeUserTable, workOrderSiteUserTable } = schema;

// Accounts are Better Auth's: these call its admin API as the signed-in user,
// so it checks their role may add users, set roles and reset passwords. A
// user's own password is changed with Better Auth from the web app.
export const userMutationRouter = router({
  createUserByAdmin: adminProcedure
    .input(userSchemas.createUserSchema)
    .mutation(
      handleProtectedMutation(async ({ input, ctx }) => {
        const [existingUser] = await ctx.db
          .select({ id: userTable.id })
          .from(userTable)
          .where(eq(userTable.email, input.email));

        if (existingUser) {
          throw alreadyExists("User", input.email, {
            userMessage: "A user with this email already exists.",
          });
        }

        const code = await ctx.db.transaction((tx) =>
          nextCode(tx, userTable, CODE_PREFIX.USER),
        );

        try {
          await ctx.auth.api.createUser({
            body: {
              name: input.name,
              email: input.email,
              password: input.password,
              role: input.role,
              data: {
                code,
                contact_number: input.contact_number || null,
                created_by: Number(ctx.user.sub),
              },
            },
            headers: ctx.headers,
          });
        } catch (error) {
          throw fromAuthError(error, "Creating user");
        }

        return {
          success: true,
          message: "User created successfully",
          user: {
            name: input.name,
            email: input.email,
            role: input.role,
          },
        };
      }),
    ),

  updateUserByAdmin: protectedProcedure
    .input(userSchemas.updateUserSchema)
    .mutation(
      handleProtectedMutation(async ({ input, ctx }) => {
        const { id, password, role, ...profile } = input;

        const [existingUser] = await ctx.db
          .select()
          .from(userTable)
          .where(eq(userTable.id, id));

        if (!existingUser) {
          throw notFound("User", id);
        }

        const isAdmin = ctx.user.role === USER_ROLES.ADMIN;
        const isOwnProfile = ctx.user.sub === id.toString();

        if (!isAdmin && !isOwnProfile) {
          throw forbidden("edit this user's profile", {
            userMessage: "You can only edit your own profile.",
          });
        }

        // Better Auth lets only admins set a password outright; everyone
        // else changes theirs with their current one, on their profile.
        if (password && !isAdmin) {
          throw forbidden("set a password", {
            userMessage:
              "Change your password from the Security section of your profile.",
          });
        }

        if (profile.email !== existingUser.email) {
          const [emailOwner] = await ctx.db
            .select({ id: userTable.id })
            .from(userTable)
            .where(
              and(eq(userTable.email, profile.email), ne(userTable.id, id)),
            );

          if (emailOwner) {
            throw alreadyExists("User", profile.email, {
              userMessage: "A user with this email already exists.",
            });
          }
        }

        // Only admins change roles; anyone else's form keeps theirs.
        const roleChanges = isAdmin && role && role !== existingUser.role;

        if (roleChanges) {
          const [officeSeats, siteSeats] = await Promise.all([
            ctx.db
              .select({ id: officeUserTable.id })
              .from(officeUserTable)
              .where(eq(officeUserTable.user_id, id)),
            ctx.db
              .select({ id: workOrderSiteUserTable.id })
              .from(workOrderSiteUserTable)
              .where(eq(workOrderSiteUserTable.user_id, id)),
          ]);

          // Office seats and work-order-site pins are only valid for the role
          // they were granted under, so they must be removed first.
          if (officeSeats.length > 0 || siteSeats.length > 0) {
            throw validationError(
              "Cannot change the role of a user with office or site assignments",
              [
                {
                  field: "role",
                  message: "Remove this user's assignments first.",
                },
              ],
              {
                userMessage: `This user is assigned to ${officeSeats.length} office(s) and ${siteSeats.length} work order site(s). Remove those assignments before changing their role.`,
              },
            );
          }
        }

        try {
          await ctx.db
            .update(userTable)
            .set(profile)
            .where(eq(userTable.id, id));
        } catch (error) {
          throw fromDatabaseError(error, "Updating user");
        }

        const userId = String(id);
        try {
          if (roleChanges) {
            await ctx.auth.api.setRole({
              body: { userId, role },
              headers: ctx.headers,
            });
          }
          if (password) {
            await ctx.auth.api.setUserPassword({
              body: { userId, newPassword: password },
              headers: ctx.headers,
            });
          }
          // A new role or password signs the user out everywhere, so they
          // come back under it.
          if ((roleChanges || password) && !isOwnProfile) {
            await ctx.auth.api.revokeUserSessions({
              body: { userId },
              headers: ctx.headers,
            });
          }
        } catch (error) {
          throw fromAuthError(error, "Updating user");
        }

        return {
          success: true,
          message: "User updated successfully",
        };
      }),
    ),
});

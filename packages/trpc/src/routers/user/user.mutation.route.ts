import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { hashPassword, USER_ROLES, verifyPassword } from "@pkg/utils/auth";
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
import { userSchemas } from "@pkg/schema";

const { userTable } = schema;

export const userMutationRouter = router({
  createUserByAdmin: adminProcedure
    .input(userSchemas.createUserSchema)
    .mutation(
      handleProtectedMutation(async ({ input, ctx }) => {
        const existingUser = await ctx.db
          .select()
          .from(userTable)
          .where(eq(userTable.email, input.email));

        if (existingUser.length > 0) {
          throw alreadyExists("User", input.email, {
            userMessage: "A user with this email already exists.",
          });
        }

        const hashedPassword = await hashPassword(input.password);

        try {
          await ctx.db.insert(userTable).values({
            ...input,
            password: hashedPassword,
          });
        } catch (error) {
          throw fromDatabaseError(error, "Creating user");
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
        const { id, password, ...rest } = input;

        const existingUser = await ctx.db
          .select()
          .from(userTable)
          .where(eq(userTable.id, id));

        if (existingUser.length === 0) {
          throw notFound("User", id);
        }

        const isAdmin = ctx.user.role === USER_ROLES.ADMIN;
        const isOwnProfile = ctx.user.sub === id.toString();

        if (!isAdmin && !isOwnProfile) {
          throw forbidden("edit this user's profile", {
            userMessage: "You can only edit your own profile.",
          });
        }

        const updateData: Record<string, any> = { ...rest };

        if (!isAdmin) {
          delete updateData.role;
          delete updateData.status;
        }

        if (password) {
          updateData.password = await hashPassword(password);
        }

        try {
          await ctx.db
            .update(userTable)
            .set(updateData)
            .where(eq(userTable.id, id));
        } catch (error) {
          throw fromDatabaseError(error, "Updating user");
        }

        return {
          success: true,
          message: "User updated successfully",
        };
      }),
    ),

  updateUserPassword: protectedProcedure
    .input(userSchemas.updateUserPasswordSchema)
    .mutation(
      handleProtectedMutation(async ({ input, ctx }) => {
        const userId = parseInt(ctx.user.sub);

        const users = await ctx.db
          .select({
            id: userTable.id,
            password: userTable.password,
          })
          .from(userTable)
          .where(eq(userTable.id, userId));

        if (!users[0] || users.length === 0) {
          throw notFound("User", userId);
        }

        const userData = users[0];

        const isCurrentPasswordValid = await verifyPassword(
          input.currentPassword,
          userData.password,
        );

        if (!isCurrentPasswordValid) {
          throw validationError(
            "Incorrect password",
            [
              {
                field: "currentPassword",
                message: "Current password is incorrect",
              },
            ],
            {
              userMessage: "The current password you entered is incorrect.",
            },
          );
        }

        const hashedNewPassword = await hashPassword(input.newPassword);

        try {
          await ctx.db
            .update(userTable)
            .set({ password: hashedNewPassword })
            .where(eq(userTable.id, userId));
        } catch (error) {
          throw fromDatabaseError(error, "Updating password");
        }

        return {
          success: true,
          message: "Password changed successfully",
        };
      }),
    ),
});

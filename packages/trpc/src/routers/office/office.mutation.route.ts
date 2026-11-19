import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { CODE_PREFIX, constants } from "@pkg/utils";
import { router } from "../../trpc";
import { adminProcedure } from "../../middleware";
import { officeSchemas } from "@pkg/schema";
import {
  notFound,
  forbidden,
  validationError,
  fromDatabaseError,
} from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { nextCode } from "../../helper/record-code";

const { officeTable, officeUserTable, userTable } = schema;
const { ROLES } = constants;

export const officeMutationRouter = router({
  createOffice: adminProcedure.input(officeSchemas.createOfficeSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { operator_ids, ...officeData } = input;
      const userId = parseInt(ctx.user!.sub);

      try {
        const { officeId } = await ctx.db.transaction(async (tx) => {
          const code = await nextCode(tx, officeTable, CODE_PREFIX.OFFICE);
          const result = await tx.insert(officeTable).values({
            ...officeData,
            code,
            name: officeData.name.trim().toLowerCase(),
            city: officeData.city.trim().toLowerCase(),
            state: officeData.state.trim().toLowerCase(),
            email: officeData.email.trim().toLowerCase(),
          });
          const officeId = result[0].insertId;

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

            const notOfficeOperators = users.filter(
              (u: { role: string }) => u.role !== ROLES.OFFICE_OPERATOR,
            );
            if (notOfficeOperators.length > 0) {
              throw validationError(
                "Only Office Operators can be assigned to an office",
                notOfficeOperators.map((u: { name: string }) => ({
                  field: "operator_ids",
                  message: `${u.name} is not an Office Operator.`,
                })),
                {
                  userMessage:
                    "Only Office Operators can be added to an office. Site Operators belong to sites.",
                },
              );
            }

            const operatorValues = operator_ids.map((operatorId: number) => ({
              user_id: operatorId,
              office_id: officeId,
              assigned_by: userId,
            }));

            await tx.insert(officeUserTable).values(operatorValues);
          }

          return { officeId };
        });

        return {
          success: true,
          officeId,
        };
      } catch (error) {
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Creating office");
      }
    }),
  ),

  // Only admins change an office's details and who works there.
  updateOffice: adminProcedure
    .input(officeSchemas.updateOfficeSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id, ...rest } = input;

        const existingOffice = await ctx.db
          .select()
          .from(officeTable)
          .where(eq(officeTable.id, id));

        if (existingOffice.length === 0) {
          throw notFound("Office", id);
        }

        try {
          await ctx.db
            .update(officeTable)
            .set(rest)
            .where(eq(officeTable.id, id));
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating office");
        }
      }),
    ),

  assignUserToOffice: adminProcedure
    .input(officeSchemas.assignUserToOfficeSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { office_id, user_id } = input;
        const userId = parseInt(ctx.user!.sub);

        const [office] = await ctx.db
          .select()
          .from(officeTable)
          .where(eq(officeTable.id, office_id));

        if (!office) {
          throw notFound("Office", office_id);
        }

        const [user] = await ctx.db
          .select()
          .from(userTable)
          .where(eq(userTable.id, user_id));

        if (!user) {
          throw notFound("User", user_id, {
            userMessage: "The selected user doesn't exist.",
          });
        }

        if (user.role !== ROLES.OFFICE_OPERATOR) {
          throw forbidden("add this user to the office as an operator", {
            userMessage:
              "Only Office Operators can be added to an office. This user isn't an Office Operator.",
          });
        }

        try {
          const [existingAssignments] = await ctx.db
            .select()
            .from(officeUserTable)
            .where(
              and(
                eq(officeUserTable.office_id, office_id),
                eq(officeUserTable.user_id, user_id),
              ),
            )
            .limit(1);

          // Already seated, there's nothing to change.
          if (!existingAssignments) {
            await ctx.db.insert(officeUserTable).values({
              user_id,
              office_id,
              assigned_by: userId,
            });
          }

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Assigning user to office");
        }
      }),
    ),

  removeUserFromOffice: adminProcedure
    .input(officeSchemas.expelUserFromOfficeSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { office_id, user_id } = input;

        const assignments = await ctx.db
          .select()
          .from(officeUserTable)
          .where(
            and(
              eq(officeUserTable.office_id, office_id),
              eq(officeUserTable.user_id, user_id),
            ),
          );

        if (!assignments[0]) {
          throw notFound("User assignment", undefined, {
            userMessage: "This user is not assigned to this office.",
          });
        }

        try {
          await ctx.db
            .delete(officeUserTable)
            .where(eq(officeUserTable.id, assignments[0].id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Removing user from office");
        }
      }),
    ),
});

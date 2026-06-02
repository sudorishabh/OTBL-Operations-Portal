import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { adminProcedure, protectedProcedure } from "../../middleware";
import { officeSchemas } from "@pkg/schema";
import {
  notFound,
  alreadyExists,
  forbidden,
  validationError,
  fromDatabaseError,
} from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { assertOfficeManager } from "../../helper/office-permissions";

const { officeTable, officeUserTable, userTable } = schema;
const { ROLES } = constants;

export const officeMutationRouter = router({
  createOffice: adminProcedure.input(officeSchemas.createOfficeSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { manager_id, operator_ids, ...officeData } = input;
      const userId = parseInt(ctx.user!.sub);

      try {
        const { officeId } = await ctx.db.transaction(async (tx) => {
          const result = await tx.insert(officeTable).values({
            ...officeData,
            name: officeData.name.trim().toLowerCase(),
            city: officeData.city.trim().toLowerCase(),
            state: officeData.state.trim().toLowerCase(),
            email: officeData.email.trim().toLowerCase(),
          });
          const officeId = result[0].insertId;

          if (manager_id) {
            const [user] = await tx
              .select()
              .from(userTable)
              .where(eq(userTable.id, manager_id));

            if (!user) {
              throw notFound("Manager", manager_id, {
                userMessage: "The selected manager doesn't exist.",
              });
            }
            await tx.insert(officeUserTable).values({
              user_id: manager_id,
              office_id: officeId,
              role: ROLES.MANAGER as "office_manager",
              assigned_by: userId,
            });
          }

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

            // Office/site split: only Office Operators may hold office seats.
            // Site Operators (and any other role) are rejected.
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
              role: "operator" as const,
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
        // Re-throw AppError instances
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Creating office");
      }
    }),
  ),

  updateOffice: protectedProcedure
    .input(officeSchemas.updateOfficeSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id, ...rest } = input;

        // Check if office exists
        const existingOffice = await ctx.db
          .select()
          .from(officeTable)
          .where(eq(officeTable.id, id));

        if (existingOffice.length === 0) {
          throw notFound("Office", id);
        }

        // Only an admin or this office's manager may edit it. Previously a
        // global managerProcedure let any manager update any office.
        await assertOfficeManager(ctx, id);

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

  assignUserToOffice: protectedProcedure
    .input(officeSchemas.assignUserToOfficeSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { office_id, user_id, role } = input;
        const userId = parseInt(ctx.user!.sub);

        // Only an admin or this office's manager may manage its members.
        // (Assigning the office's first manager has no office-manager yet, so
        // that case is admin-only — which matches how offices are set up.)
        await assertOfficeManager(ctx, office_id);

        // Verify office exists
        const [office] = await ctx.db
          .select()
          .from(officeTable)
          .where(eq(officeTable.id, office_id));

        if (!office) {
          throw notFound("Office", office_id);
        }

        // Verify user exists
        const [user] = await ctx.db
          .select()
          .from(userTable)
          .where(eq(userTable.id, user_id));

        if (!user) {
          throw notFound("User", user_id, {
            userMessage: "The selected user doesn't exist.",
          });
        }

        // Office/site split: an office-operator seat may only be filled by a
        // user whose global role is office_operator. Site Operators belong to
        // sites, not offices. (Manager seats are gated by the manager pool.)
        if (role === "operator" && user.role !== ROLES.OFFICE_OPERATOR) {
          throw forbidden("add this user to the office as an operator", {
            userMessage:
              "Only Office Operators can be added to an office. This user isn't an Office Operator.",
          });
        }

        // If assigning as manager, check if office already has a manager
        if (role === ROLES.MANAGER) {
          const existingManagers = await ctx.db
            .select()
            .from(officeUserTable)
            .where(
              and(
                eq(officeUserTable.office_id, office_id),
                eq(officeUserTable.role, ROLES.MANAGER),
              ),
            );

          if (existingManagers.length > 0) {
            throw alreadyExists("Manager", undefined, {
              userMessage:
                "This office already has a manager. Please remove the existing manager first.",
            });
          }
        }

        try {
          // Check if user is already assigned to this office
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

          if (existingAssignments) {
            // Update the role if already assigned
            await ctx.db
              .update(officeUserTable)
              .set({ role })
              .where(eq(officeUserTable.id, existingAssignments.id));
          } else {
            // Create new assignment
            await ctx.db.insert(officeUserTable).values({
              user_id,
              office_id,
              role,
              assigned_by: userId,
            });
          }

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Assigning user to office");
        }
      }),
    ),

  removeUserFromOffice: protectedProcedure
    .input(officeSchemas.expelUserFromOfficeSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { office_id, user_id } = input;

        // Only an admin or this office's manager may remove its members.
        await assertOfficeManager(ctx, office_id);

        // Check if assignment exists
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

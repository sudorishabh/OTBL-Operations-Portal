import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertOfficeManager } from "../../helper/office-permissions";
import { businessRule, fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { z } from "zod";
import {
  coversRestoration,
  createRestorationRow,
  restorationRowWhere,
} from "./restoration-row";

const { workOrderTable, workOrderSiteTable } = schema;

const isAppError = (error: unknown) =>
  !!error && typeof error === "object" && "errorCode" in error;

export const restorationMutationRouter = router({
  // Sets up restoration for a work order created before it was set up
  // automatically. Running it again returns the existing row.
  setUpRestoration: protectedProcedure
    .input(z.object({ work_order_id: z.number().positive() }))
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const [workOrder] = await ctx.db
          .select({
            id: workOrderTable.id,
            client_id: workOrderTable.client_id,
            office_id: workOrderTable.office_id,
            process_type: workOrderTable.process_type,
            start_date: workOrderTable.start_date,
            end_date: workOrderTable.end_date,
          })
          .from(workOrderTable)
          .where(eq(workOrderTable.id, input.work_order_id));

        if (!workOrder) {
          throw notFound("Work order", input.work_order_id);
        }

        await assertOfficeManager(ctx, workOrder.office_id);

        if (!coversRestoration(workOrder.process_type)) {
          throw businessRule("This work order doesn't include restoration.");
        }

        try {
          const id = await ctx.db.transaction(async (tx) => {
            // Lock the work order so two set-ups can't both add a row.
            await tx
              .select({ id: workOrderTable.id })
              .from(workOrderTable)
              .where(eq(workOrderTable.id, workOrder.id))
              .for("update");

            const [existing] = await tx
              .select({ id: workOrderSiteTable.id })
              .from(workOrderSiteTable)
              .where(restorationRowWhere(workOrder.id))
              .limit(1);

            return existing
              ? existing.id
              : await createRestorationRow(tx, workOrder);
          });

          return { success: true, id };
        } catch (error) {
          if (isAppError(error)) throw error;
          throw fromDatabaseError(error, "Setting up restoration");
        }
      }),
    ),
});

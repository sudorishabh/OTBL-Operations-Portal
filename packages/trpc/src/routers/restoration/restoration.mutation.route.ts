import { eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
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

const { workOrderTable, workOrderSiteTable, contractorTable } = schema;
const { WO_PROCESS, STATUS } = constants;

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

  // The vendor the restoration is ordered to; null clears it.
  setRestorationContractor: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        contractor_id: z.number().positive().nullable(),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const [restoration] = await ctx.db
          .select({
            process_type: workOrderSiteTable.process_type,
            office_id: workOrderTable.office_id,
          })
          .from(workOrderSiteTable)
          .innerJoin(
            workOrderTable,
            eq(workOrderSiteTable.work_order_id, workOrderTable.id),
          )
          .where(eq(workOrderSiteTable.id, input.work_order_site_id));

        if (
          !restoration ||
          restoration.process_type !== WO_PROCESS.RESTORATION
        ) {
          throw notFound("Restoration", input.work_order_site_id);
        }

        await assertOfficeManager(ctx, restoration.office_id);

        if (input.contractor_id) {
          const [vendor] = await ctx.db
            .select({
              office_id: contractorTable.office_id,
              status: contractorTable.status,
            })
            .from(contractorTable)
            .where(eq(contractorTable.id, input.contractor_id));

          if (!vendor) {
            throw notFound("Vendor", input.contractor_id);
          }
          if (vendor.office_id !== restoration.office_id) {
            throw businessRule("This vendor belongs to another office.");
          }
          if (vendor.status !== STATUS.ACTIVE) {
            throw businessRule("This vendor is inactive.");
          }
        }

        try {
          await ctx.db
            .update(workOrderSiteTable)
            .set({ contractor_id: input.contractor_id })
            .where(eq(workOrderSiteTable.id, input.work_order_site_id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(
            error,
            "Assigning the restoration contractor",
          );
        }
      }),
    ),
});

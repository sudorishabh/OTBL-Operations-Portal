import { and, count, eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertOfficeManager } from "../../helper/office-permissions";
import { businessRule, fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import type { TrpcContext } from "../../context";
import { z } from "zod";
import {
  coversRestoration,
  createRestorationRow,
  restorationRowWhere,
} from "./restoration-row";

const {
  workOrderTable,
  workOrderSiteTable,
  workOrderSiteContractorTable,
  workOrderSiteExpenseTable,
  contractorTable,
} = schema;
const { WO_PROCESS, STATUS } = constants;

const isAppError = (error: unknown) =>
  !!error && typeof error === "object" && "errorCode" in error;

// Only the office manager of the work order's office changes who its
// restoration is ordered to.
async function assertManagesRestoration(
  ctx: TrpcContext,
  workOrderSiteId: number,
) {
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
    .where(eq(workOrderSiteTable.id, workOrderSiteId));

  if (!restoration || restoration.process_type !== WO_PROCESS.RESTORATION) {
    throw notFound("Restoration", workOrderSiteId);
  }

  await assertOfficeManager(ctx, restoration.office_id);
}

async function assertActiveVendor(ctx: TrpcContext, contractorId: number) {
  const [vendor] = await ctx.db
    .select({ status: contractorTable.status })
    .from(contractorTable)
    .where(eq(contractorTable.id, contractorId));

  if (!vendor) {
    throw notFound("Vendor", contractorId);
  }
  if (vendor.status !== STATUS.ACTIVE) {
    throw businessRule("This vendor is inactive.");
  }
}

const assignmentWhere = (workOrderSiteId: number, contractorId: number) =>
  and(
    eq(workOrderSiteContractorTable.work_order_site_id, workOrderSiteId),
    eq(workOrderSiteContractorTable.contractor_id, contractorId),
  );

const restorationContractorInput = z.object({
  work_order_site_id: z.number().positive(),
  contractor_id: z.number().positive(),
});

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
        await assertManagesRestoration(ctx, input.work_order_site_id);

        if (input.contractor_id) {
          await assertActiveVendor(ctx, input.contractor_id);
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

  // Adds a vendor to the contractors the restoration is ordered to.
  addRestorationContractor: protectedProcedure
    .input(restorationContractorInput)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertManagesRestoration(ctx, input.work_order_site_id);
        await assertActiveVendor(ctx, input.contractor_id);

        const [existing] = await ctx.db
          .select({ id: workOrderSiteContractorTable.id })
          .from(workOrderSiteContractorTable)
          .where(
            assignmentWhere(input.work_order_site_id, input.contractor_id),
          );
        if (existing) {
          throw businessRule("This vendor is already a contractor here.");
        }

        try {
          await ctx.db.insert(workOrderSiteContractorTable).values({
            work_order_site_id: input.work_order_site_id,
            contractor_id: input.contractor_id,
            assigned_by: Number(ctx.user!.sub),
          });

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Adding the restoration contractor");
        }
      }),
    ),

  // Removes a contractor, as long as no expenses are recorded under it.
  removeRestorationContractor: protectedProcedure
    .input(restorationContractorInput)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertManagesRestoration(ctx, input.work_order_site_id);

        const [expenses] = await ctx.db
          .select({ total: count() })
          .from(workOrderSiteExpenseTable)
          .where(
            and(
              eq(
                workOrderSiteExpenseTable.work_order_site_id,
                input.work_order_site_id,
              ),
              eq(workOrderSiteExpenseTable.contractor_id, input.contractor_id),
            ),
          );
        const expenseCount = expenses?.total ?? 0;
        if (expenseCount > 0) {
          throw businessRule(
            `This contractor has ${expenseCount} expense${expenseCount === 1 ? "" : "s"} recorded under it. Move or delete them first.`,
          );
        }

        try {
          await ctx.db
            .delete(workOrderSiteContractorTable)
            .where(
              assignmentWhere(input.work_order_site_id, input.contractor_id),
            );

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Removing the restoration contractor");
        }
      }),
    ),
});

import { eq, and } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../middleware";
import { workOrderSchemas } from "@pkg/schema";
import {
  notFound,
  validationError,
  fromDatabaseError,
  alreadyExists,
  businessRule,
} from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import {
  assertOfficeMember,
  assertOfficeManager,
} from "../../helper/office-permissions";

const {
  workOrderTable,
  clientTable,
  proposalTable,
  scheduleOfRatesTable,
  workOrderSiteTable,
  siteActivityTable,
  siteTable,
} = schema;

export const workOrderMutationRouter = router({
  createWorkOrder: protectedProcedure
    .input(workOrderSchemas.createWorkOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        // Validate client exists
        const existingClient = await ctx.db
          .select()
          .from(clientTable)
          .where(eq(clientTable.id, input.client_id));

        if (existingClient.length === 0) {
          throw notFound("Client", input.client_id, {
            userMessage: "The selected client doesn't exist.",
          });
        }

        // Validate proposal exists
        const existingProposal = await ctx.db
          .select()
          .from(proposalTable)
          .where(eq(proposalTable.id, input.proposal_id));

        if (existingProposal.length === 0) {
          throw notFound("Proposal", input.proposal_id, {
            userMessage: "The selected proposal doesn't exist.",
          });
        }

        // Get office_id from the proposal
        const proposal = existingProposal[0]!;
        const officeId = proposal.office_id;

        // Drafting a work order is an office-staff action: caller must belong
        // to the office (manager or operator). Activation is manager-only.
        await assertOfficeMember(ctx, officeId);

        // Build work order data object
        const workOrderData = {
          code: input.code,
          agreement_number: input.agreement_number,
          rate_contract_number: input.rate_contract_number,
          title: input.title,
          proposal_id: input.proposal_id,
          client_id: input.client_id,
          office_id: officeId,
          start_date: input?.start_date,
          end_date: input.end_date,
          handing_over_date: input.handing_over_date,
          document_key: input.document_key,
          process_type: input.process_type,
          description: input.description || null,
          // Force draft state; activation is a separate manager-only step.
          status: constants.WORK_ORDER_STATUS.PENDING,
          created_by: parseInt(ctx.user!.sub),
        };

        try {
          // Create the work order
          const workOrderResult = await ctx.db
            .insert(workOrderTable)
            .values(workOrderData);

          const workOrderId = workOrderResult[0].insertId;

          // Create schedule of rates entries
          if (input.schedule_of_rates && input.schedule_of_rates.length > 0) {
            const scheduleOfRatesData = input.schedule_of_rates.map((sor: any) => ({
              work_order_id: workOrderId,
              activity: sor.activity.name,
              unit: sor.unit,
              estimated_quantity: sor.estimated_quantity.toString(),
              rc_unit_rate: sor.rc_unit_rate.toString(),
              gst_percentage: sor.gst_percentage.toString(),
              unit_rate_inc_gst: sor.unit_rate_inc_gst.toString(),
              total_cost: sor.total_cost.toString(),
              transportation_km: sor.transportation_km?.toString() || null,
            }));

            await ctx.db
              .insert(scheduleOfRatesTable)
              .values(scheduleOfRatesData);
          }

          return {
            success: true,
            workOrderId,
            clientId: input.client_id,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Creating work order");
        }
      }),
    ),

  deleteWorkOrder: protectedProcedure
    .input(workOrderSchemas.deleteWorkOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id } = input;

        // Check if work order exists
        const existingWorkOrder = await ctx.db
          .select()
          .from(workOrderTable)
          .where(eq(workOrderTable.id, id));

        if (existingWorkOrder.length === 0) {
          throw notFound("Work order", id);
        }

        try {
          await ctx.db.delete(workOrderTable).where(eq(workOrderTable.id, id));
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting work order");
        }
      }),
    ),

  // Manager-only: approve a drafted work order, flipping the approval gate so
  // it goes live. Leaves the pending/completed/cancelled status untouched.
  approveWorkOrder: protectedProcedure
    .input(workOrderSchemas.approveWorkOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const [workOrder] = await ctx.db
          .select()
          .from(workOrderTable)
          .where(eq(workOrderTable.id, input.id));

        if (!workOrder) {
          throw notFound("Work order", input.id);
        }

        // Only this work order's office manager (or an admin) may approve it.
        await assertOfficeManager(ctx, workOrder.office_id);

        if (workOrder.status === constants.WORK_ORDER_STATUS.CANCELLED) {
          throw businessRule("A cancelled work order cannot be approved.");
        }

        if (workOrder.approved_at) {
          throw businessRule("This work order is already approved.");
        }

        try {
          await ctx.db
            .update(workOrderTable)
            .set({
              approved_at: new Date(),
              approved_by: parseInt(ctx.user!.sub),
            })
            .where(eq(workOrderTable.id, input.id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Approving work order");
        }
      }),
    ),

  // Manager-only: cancel a work order with a required reason.
  cancelWorkOrder: protectedProcedure
    .input(workOrderSchemas.cancelWorkOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const [workOrder] = await ctx.db
          .select()
          .from(workOrderTable)
          .where(eq(workOrderTable.id, input.id));

        if (!workOrder) {
          throw notFound("Work order", input.id);
        }

        await assertOfficeManager(ctx, workOrder.office_id);

        if (workOrder.status === constants.WORK_ORDER_STATUS.CANCELLED) {
          throw businessRule("This work order is already cancelled.");
        }

        try {
          await ctx.db
            .update(workOrderTable)
            .set({
              status: constants.WORK_ORDER_STATUS.CANCELLED,
              cancellation_reason: input.cancellation_reason,
            })
            .where(eq(workOrderTable.id, input.id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Cancelling work order");
        }
      }),
    ),

  createWorkOrderSite: protectedProcedure
    .input(workOrderSchemas.createWorkOrderSiteSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        return await ctx.db.transaction(async (tx: any) => {
          let siteId = input.site_id;

          // 1. Handle new site creation if provided
          if (!siteId && input.new_site) {
            const [siteResult] = await tx.insert(siteTable).values({
              ...input.new_site,
              office_id: (
                await tx
                  .select({ office_id: proposalTable.office_id })
                  .from(workOrderTable)
                  .innerJoin(
                    proposalTable,
                    eq(workOrderTable.proposal_id, proposalTable.id),
                  )
                  .where(eq(workOrderTable.id, input.work_order_id))
              )[0]?.office_id as number,
            });
            siteId = siteResult.insertId;
          }

          if (!siteId) {
            throw validationError("Site ID is required", [
              { field: "site_id", message: "Site ID is required" },
            ]);
          }

          // 2. Check if this site is already assigned to this work order
          const existingAssignment = await tx
            .select()
            .from(workOrderSiteTable)
            .where(
              and(
                eq(workOrderSiteTable.work_order_id, input.work_order_id),
                eq(workOrderSiteTable.site_id, siteId),
              ),
            );

          if (existingAssignment.length > 0) {
            throw alreadyExists("Work order site assignment", undefined, {
              userMessage: "This site is already assigned to this work order.",
            });
          }

          // 3. Validate schedule of rates
          const existingScheduleOfRate = await tx
            .select()
            .from(scheduleOfRatesTable)
            .where(eq(scheduleOfRatesTable.work_order_id, input.work_order_id));

          if (existingScheduleOfRate.length === 0) {
            throw notFound("Schedule of rate", input.work_order_id);
          }

          try {
            // 4. Create the work order site
            const [result] = await tx.insert(workOrderSiteTable).values({
              work_order_id: input.work_order_id,
              client_id: input.client_id,
              site_id: siteId,
              date: input.date,
              end_date: input.end_date,
              process_type: input.process_type,
              job_number: input.job_number,
              area: input.area,
              installation_type: input.installation_type,
              joint_estimate_number: input.joint_estimate_number,
              land_owner_name: input.land_owner_name,
              remarks: input.remarks || "",
              status: "pending",
            });

            const workOrderSiteId = result.insertId;

            // 5. Create associated site activities if selected
            if (
              input.selected_activities &&
              input.selected_activities.length > 0
            ) {
              const activityValues = input.selected_activities.map(
                (activity: any) => ({
                  work_order_site_id: workOrderSiteId,
                  activity: activity.name,
                  unit: activity.unit,
                  schedule_of_rates_id: activity.schedule_of_rate_id,
                }),
              );

              await tx.insert(siteActivityTable).values(activityValues);
            }

            return { success: true, workOrderSiteId };
          } catch (error) {
            throw fromDatabaseError(error, "Adding work order site");
          }
        });
      }),
    ),
});

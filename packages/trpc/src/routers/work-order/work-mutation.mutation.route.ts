import { eq, and } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure, adminProcedure } from "../../middleware";
import { workOrderSchemas } from "@pkg/schema";
import {
  notFound,
  validationError,
  fromDatabaseError,
  alreadyExists,
  businessRule,
} from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { assertOfficeManager } from "../../helper/office-permissions";
import {
  coversRestoration,
  createRestorationRow,
  restorationRowWhere,
  syncRestorationCompletion,
} from "../restoration/restoration-row";

// Allowance for decimal rounding when checking transport slab totals.
const SLAB_EPSILON = 0.005;

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
  createWorkOrder: adminProcedure
    .input(workOrderSchemas.createWorkOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const existingClient = await ctx.db
          .select()
          .from(clientTable)
          .where(eq(clientTable.id, input.client_id));

        if (existingClient.length === 0) {
          throw notFound("Client", input.client_id, {
            userMessage: "The selected client doesn't exist.",
          });
        }

        const existingProposal = await ctx.db
          .select()
          .from(proposalTable)
          .where(eq(proposalTable.id, input.proposal_id));

        if (existingProposal.length === 0) {
          throw notFound("Proposal", input.proposal_id, {
            userMessage: "The selected proposal doesn't exist.",
          });
        }

        // A proposal has at most one work order.
        const [existingWorkOrder] = await ctx.db
          .select({ id: workOrderTable.id })
          .from(workOrderTable)
          .where(eq(workOrderTable.proposal_id, input.proposal_id))
          .limit(1);

        if (existingWorkOrder) {
          throw alreadyExists("Work order", undefined, {
            userMessage: "This proposal already has a work order.",
          });
        }

        const proposal = existingProposal[0]!;
        const officeId = proposal.office_id;

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
          documents: input.documents,
          // Legacy single-document column, kept until it is dropped.
          document_key: input.documents[0]!.url,
          process_type: input.process_type,
          description: input.description || null,
          job_number: input.job_number,
          area: input.area,
          installation_type: input.installation_type,
          joint_estimate_number: input.joint_estimate_number,
          land_owner_name: input.land_owner_name,
          remarks: input.remarks || "",
          status: constants.WORK_ORDER_STATUS.PENDING,
          created_by: parseInt(ctx.user!.sub),
        };

        try {
          // One transaction, so a failed SOR insert leaves no work order behind.
          const workOrderId = await ctx.db.transaction(async (tx) => {
            const workOrderResult = await tx
              .insert(workOrderTable)
              .values(workOrderData);

            const workOrderId = workOrderResult[0].insertId;

            if (input.schedule_of_rates.length > 0) {
              const scheduleOfRatesData = input.schedule_of_rates.map(
                (sor) => ({
                  work_order_id: workOrderId,
                  activity: sor.activity.name,
                  unit: sor.unit,
                  estimated_quantity: sor.estimated_quantity.toString(),
                  rc_unit_rate: sor.rc_unit_rate.toString(),
                  gst_percentage: sor.gst_percentage.toString(),
                  unit_rate_inc_gst: sor.unit_rate_inc_gst.toString(),
                  total_cost: sor.total_cost.toString(),
                  transportation_slabs: sor.transportation_slabs ?? null,
                }),
              );

              await tx.insert(scheduleOfRatesTable).values(scheduleOfRatesData);
            }

            // Restoration has no sites, so its one row is set up right away.
            if (coversRestoration(input.process_type)) {
              await createRestorationRow(tx, {
                id: workOrderId,
                client_id: input.client_id,
                start_date: workOrderData.start_date,
                end_date: workOrderData.end_date,
              });
            }

            return workOrderId;
          });

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

  // Admins can correct a work order's details whatever its status.
  updateWorkOrder: adminProcedure
    .input(workOrderSchemas.updateWorkOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id, ...details } = input;

        const [workOrder] = await ctx.db
          .select({ id: workOrderTable.id })
          .from(workOrderTable)
          .where(eq(workOrderTable.id, id));

        if (!workOrder) {
          throw notFound("Work order", id);
        }

        try {
          await ctx.db.transaction(async (tx) => {
            await tx
              .update(workOrderTable)
              .set({
                ...details,
                description: details.description || null,
                remarks: details.remarks || "",
                // Legacy single-document column, kept until it is dropped.
                document_key: details.documents[0]!.url,
              })
              .where(eq(workOrderTable.id, id));

            // The restoration row runs over the work order's dates.
            await tx
              .update(workOrderSiteTable)
              .set({ date: details.start_date, end_date: details.end_date })
              .where(restorationRowWhere(id));
          });

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating work order");
        }
      }),
    ),

  // Admins can correct the quantity and rate of the work order's schedule of
  // rates rows. Restoration completion depends on them, so it is re-checked.
  updateScheduleOfRates: adminProcedure
    .input(workOrderSchemas.updateScheduleOfRatesSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const rows = await ctx.db
          .select({
            id: scheduleOfRatesTable.id,
            activity: scheduleOfRatesTable.activity,
            gst_percentage: scheduleOfRatesTable.gst_percentage,
          })
          .from(scheduleOfRatesTable)
          .where(eq(scheduleOfRatesTable.work_order_id, input.work_order_id));
        const rowById = new Map(rows.map((row) => [row.id, row]));

        const updates = input.rates.map((rate) => {
          const row = rowById.get(rate.id);
          if (!row) {
            throw notFound("Schedule of rate", rate.id, {
              userMessage:
                "A schedule of rates row doesn't belong to this work order.",
            });
          }

          const isTransport =
            row.activity ===
            constants.WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL;
          if (isTransport) {
            const slabTotal = Object.values(
              rate.transportation_slabs ?? {},
            ).reduce((sum, qty) => sum + qty, 0);
            if (
              !rate.transportation_slabs ||
              Math.abs(slabTotal - rate.estimated_quantity) > SLAB_EPSILON
            ) {
              throw validationError(
                "Transportation quantity must equal the sum of its distance slabs",
                [
                  {
                    field: "transportation_slabs",
                    message: "Quantity must equal the sum of the distance slabs",
                  },
                ],
              );
            }
          }

          const unitRateIncGst =
            rate.rc_unit_rate * (1 + Number(row.gst_percentage) / 100);
          return {
            id: row.id,
            values: {
              estimated_quantity: rate.estimated_quantity.toFixed(2),
              rc_unit_rate: rate.rc_unit_rate.toFixed(2),
              unit_rate_inc_gst: unitRateIncGst.toFixed(2),
              total_cost: (unitRateIncGst * rate.estimated_quantity).toFixed(2),
              ...(isTransport && {
                transportation_slabs: rate.transportation_slabs,
              }),
            },
          };
        });

        try {
          await ctx.db.transaction(async (tx) => {
            for (const update of updates) {
              await tx
                .update(scheduleOfRatesTable)
                .set(update.values)
                .where(eq(scheduleOfRatesTable.id, update.id));
            }

            const [restoration] = await tx
              .select({ id: workOrderSiteTable.id })
              .from(workOrderSiteTable)
              .where(restorationRowWhere(input.work_order_id));
            if (restoration) {
              await syncRestorationCompletion(tx, restoration.id);
            }
          });

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating schedule of rates");
        }
      }),
    ),

  // global admins (previously this had no role gate at all).
  deleteWorkOrder: adminProcedure
    .input(workOrderSchemas.deleteWorkOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id } = input;

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

  approveWorkOrder: adminProcedure
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

  cancelWorkOrder: adminProcedure
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
          const [workOrder] = await tx
            .select({ process_type: workOrderTable.process_type })
            .from(workOrderTable)
            .where(eq(workOrderTable.id, input.work_order_id));

          if (!workOrder) {
            throw notFound("Work order", input.work_order_id);
          }

          // Sites are only for bioremediation; restoration has none.
          if (workOrder.process_type === constants.WO_PROCESS.RESTORATION) {
            throw businessRule(
              "Restoration work orders don't have sites. Only bioremediation work is done at sites.",
            );
          }

          let siteId = input.site_id;

          if (!siteId && input.new_site) {
            const [woOffice] = await tx
              .select({ office_id: proposalTable.office_id })
              .from(workOrderTable)
              .innerJoin(
                proposalTable,
                eq(workOrderTable.proposal_id, proposalTable.id),
              )
              .where(eq(workOrderTable.id, input.work_order_id));
            const officeId = woOffice?.office_id as number;

            await assertOfficeManager(ctx, officeId);

            const [siteResult] = await tx.insert(siteTable).values({
              ...input.new_site,
              office_id: officeId,
            });
            siteId = siteResult.insertId;
          }

          if (!siteId) {
            throw validationError("Site ID is required", [
              { field: "site_id", message: "Site ID is required" },
            ]);
          }

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

          const existingScheduleOfRate = await tx
            .select()
            .from(scheduleOfRatesTable)
            .where(eq(scheduleOfRatesTable.work_order_id, input.work_order_id));

          if (existingScheduleOfRate.length === 0) {
            throw notFound("Schedule of rate", input.work_order_id);
          }

          try {
            const [result] = await tx.insert(workOrderSiteTable).values({
              work_order_id: input.work_order_id,
              client_id: input.client_id,
              site_id: siteId,
              date: input.date,
              end_date: input.end_date,
              process_type: constants.WO_PROCESS.BIOREMEDIATION,
              status: "pending",
            });

            const workOrderSiteId = result.insertId;

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

  // Admins can correct the dates a site runs over. The restoration row runs
  // over its work order's dates, so it changes with the work order instead.
  updateWorkOrderSiteDates: adminProcedure
    .input(workOrderSchemas.updateWorkOrderSiteDatesSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const [woSite] = await ctx.db
          .select({ site_id: workOrderSiteTable.site_id })
          .from(workOrderSiteTable)
          .where(eq(workOrderSiteTable.id, input.id));

        if (!woSite) {
          throw notFound("Work order site", input.id);
        }
        if (woSite.site_id === null) {
          throw businessRule(
            "Restoration runs over the work order's dates. Edit the work order to change them.",
          );
        }

        try {
          await ctx.db
            .update(workOrderSiteTable)
            .set({ date: input.date, end_date: input.end_date })
            .where(eq(workOrderSiteTable.id, input.id));

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating work order site dates");
        }
      }),
    ),
});

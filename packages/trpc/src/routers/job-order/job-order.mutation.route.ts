import { and, count, eq, inArray, notInArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { jobOrderSchemas, type jobOrderTypes } from "@pkg/schema";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertOfficeManager } from "../../helper/office-permissions";
import { businessRule, fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import type { TrpcContext } from "../../context";
import { syncRestorationCompletion } from "../restoration/restoration-row";

const {
  workOrderTable,
  workOrderSiteTable,
  contractorTable,
  jobOrderTable,
  jobOrderContractorTable,
  workOrderSiteExpenseTable,
} = schema;
const { WO_PROCESS } = constants;

// Job orders belong to a work order's restoration row, and only the office
// manager of the work order's office gives them out.
async function assertManagesRestoration(
  ctx: TrpcContext,
  workOrderSiteId: number,
) {
  const [row] = await ctx.db
    .select({
      process_type: workOrderSiteTable.process_type,
      site_id: workOrderSiteTable.site_id,
      office_id: workOrderTable.office_id,
    })
    .from(workOrderSiteTable)
    .innerJoin(
      workOrderTable,
      eq(workOrderSiteTable.work_order_id, workOrderTable.id),
    )
    .where(eq(workOrderSiteTable.id, workOrderSiteId));

  if (!row) {
    throw notFound("Restoration", workOrderSiteId);
  }
  if (row.process_type !== WO_PROCESS.RESTORATION || row.site_id !== null) {
    throw businessRule("Job orders are only given out under restoration.");
  }
  await assertOfficeManager(ctx, row.office_id);
}

async function getJobOrder(ctx: TrpcContext, id: number) {
  const [jobOrder] = await ctx.db
    .select({ work_order_site_id: jobOrderTable.work_order_site_id })
    .from(jobOrderTable)
    .where(eq(jobOrderTable.id, id));

  if (!jobOrder) {
    throw notFound("Job order", id);
  }
  return jobOrder;
}

async function assertVendorsExist(ctx: TrpcContext, contractorIds: number[]) {
  const [vendors] = await ctx.db
    .select({ total: count() })
    .from(contractorTable)
    .where(inArray(contractorTable.id, contractorIds));

  if ((vendors?.total ?? 0) !== contractorIds.length) {
    throw businessRule("One of the chosen vendors no longer exists.");
  }
}

// Expenses recorded on a job order, optionally only under the given vendors.
async function countJobOrderExpenses(
  ctx: TrpcContext,
  jobOrderId: number,
  contractorIds?: number[],
) {
  const [result] = await ctx.db
    .select({ total: count() })
    .from(workOrderSiteExpenseTable)
    .where(
      and(
        eq(workOrderSiteExpenseTable.job_order_id, jobOrderId),
        contractorIds
          ? inArray(workOrderSiteExpenseTable.contractor_id, contractorIds)
          : undefined,
      ),
    );
  return result?.total ?? 0;
}

const unique = (ids: number[]) => [...new Set(ids)];

// Activity rows with nothing written against them aren't saved.
const filledActivities = (
  activities: jobOrderTypes.JobOrderValues["activities"],
) => (activities ?? []).filter((row) => row.quantity || row.completion_date);

// The job order's fields as they are saved. Blank answers are saved as
// nothing.
const jobOrderValues = (input: jobOrderTypes.JobOrderValues) => ({
  jo_number: input.jo_number,
  title: input.title,
  start_date: input.start_date,
  end_date: input.end_date,
  description: input.description || null,
  issued_by: input.issued_by || null,
  rc_noa_number: input.rc_noa_number || null,
  rc_noa_date: input.rc_noa_date ?? null,
  ola_number: input.ola_number || null,
  po_number: input.po_number || null,
  installation_name: input.installation_name,
  location: input.location,
  mobilization_date: input.mobilization_date ?? null,
  activities: filledActivities(input.activities),
});

export const jobOrderMutationRouter = router({
  createJobOrder: protectedProcedure
    .input(jobOrderSchemas.createJobOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertManagesRestoration(ctx, input.work_order_site_id);
        const contractorIds = unique(input.contractor_ids);
        await assertVendorsExist(ctx, contractorIds);

        try {
          const id = await ctx.db.transaction(async (tx) => {
            const [result] = await tx.insert(jobOrderTable).values({
              ...jobOrderValues(input),
              work_order_site_id: input.work_order_site_id,
              documents: [],
              created_by: Number(ctx.user!.sub),
            });
            const jobOrderId = Number(result.insertId);

            await tx.insert(jobOrderContractorTable).values(
              contractorIds.map((contractorId) => ({
                job_order_id: jobOrderId,
                contractor_id: contractorId,
              })),
            );
            return jobOrderId;
          });

          return { success: true, id };
        } catch (error) {
          throw fromDatabaseError(error, "Creating job order");
        }
      }),
    ),

  // A vendor with expenses on the job order can't be taken off it.
  updateJobOrder: protectedProcedure
    .input(jobOrderSchemas.updateJobOrderSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const jobOrder = await getJobOrder(ctx, input.id);
        await assertManagesRestoration(ctx, jobOrder.work_order_site_id);
        const contractorIds = unique(input.contractor_ids);
        await assertVendorsExist(ctx, contractorIds);

        const current = await ctx.db
          .select({ contractor_id: jobOrderContractorTable.contractor_id })
          .from(jobOrderContractorTable)
          .where(eq(jobOrderContractorTable.job_order_id, input.id));
        const currentIds = current.map((vendor) => vendor.contractor_id);
        const droppedIds = currentIds.filter(
          (id) => !contractorIds.includes(id),
        );
        if (
          droppedIds.length > 0 &&
          (await countJobOrderExpenses(ctx, input.id, droppedIds)) > 0
        ) {
          throw businessRule(
            "A vendor with expenses on this job order can't be removed.",
          );
        }

        try {
          await ctx.db.transaction(async (tx) => {
            await tx
              .update(jobOrderTable)
              .set(jobOrderValues(input))
              .where(eq(jobOrderTable.id, input.id));

            await tx
              .delete(jobOrderContractorTable)
              .where(
                and(
                  eq(jobOrderContractorTable.job_order_id, input.id),
                  notInArray(jobOrderContractorTable.contractor_id, contractorIds),
                ),
              );
            const added = contractorIds.filter((id) => !currentIds.includes(id));
            if (added.length > 0) {
              await tx.insert(jobOrderContractorTable).values(
                added.map((contractorId) => ({
                  job_order_id: input.id,
                  contractor_id: contractorId,
                })),
              );
            }
          });

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating job order");
        }
      }),
    ),

  setJobOrderCompletion: protectedProcedure
    .input(jobOrderSchemas.setJobOrderCompletionSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const jobOrder = await getJobOrder(ctx, input.id);
        await assertManagesRestoration(ctx, jobOrder.work_order_site_id);

        // The certified quantities use up the schedule of rates, so the
        // restoration may now be complete, or no longer.
        try {
          await ctx.db.transaction(async (tx) => {
            await tx
              .update(jobOrderTable)
              .set({
                completed_on: input.completed_on ?? null,
                completion_activities: filledActivities(input.activities),
              })
              .where(eq(jobOrderTable.id, input.id));
            await syncRestorationCompletion(tx, jobOrder.work_order_site_id);
          });
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Saving job order completion");
        }
      }),
    ),

  setJobOrderCertificates: protectedProcedure
    .input(jobOrderSchemas.setJobOrderCertificatesSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const jobOrder = await getJobOrder(ctx, input.id);
        await assertManagesRestoration(ctx, jobOrder.work_order_site_id);

        try {
          await ctx.db
            .update(jobOrderTable)
            .set({ documents: input.documents })
            .where(eq(jobOrderTable.id, input.id));
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Saving job order certificates");
        }
      }),
    ),

  deleteJobOrder: protectedProcedure
    .input(jobOrderSchemas.jobOrderIdSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const jobOrder = await getJobOrder(ctx, input.id);
        await assertManagesRestoration(ctx, jobOrder.work_order_site_id);

        if ((await countJobOrderExpenses(ctx, input.id)) > 0) {
          throw businessRule(
            "This job order has expenses recorded on it. Delete them first.",
          );
        }

        // Its certified quantities go with it.
        try {
          await ctx.db.transaction(async (tx) => {
            await tx
              .delete(jobOrderTable)
              .where(eq(jobOrderTable.id, input.id));
            await syncRestorationCompletion(tx, jobOrder.work_order_site_id);
          });
          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting job order");
        }
      }),
    ),
});

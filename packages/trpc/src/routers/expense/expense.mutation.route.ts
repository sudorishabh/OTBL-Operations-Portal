import { and, eq, ne, sum } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { businessRule, fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { z } from "zod";
import { validators } from "@pkg/schema";
import { constants } from "@pkg/utils";
import { syncRestorationCompletion } from "../restoration/restoration-row";

const {
  workOrderSiteTable,
  workOrderSiteExpenseTable,
  bioremediationContSoilTable,
  siteActivityTable,
  scheduleOfRatesTable,
} = schema;

const { WO_ACTIVITIES, WO_PROCESS, OIL_ZAPPER, allActivityOptions } = constants;

const RESTORATION_ACTIVITIES = new Set<string>(
  allActivityOptions
    .filter((option) => !option.isBioremediation)
    .map((option) => option.value),
);

// The quantity an activity's expenses are measured against: bioremediation's
// estimate (its soil, or the oil zapper planned for it), or for restoration,
// which has no estimate, its schedule of rates.
async function getEstimateQtyForSite(
  ctx: any,
  siteId: number,
  activityKey: string,
): Promise<number | null> {
  if (
    activityKey === WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL ||
    activityKey === OIL_ZAPPER.KEY
  ) {
    const [estimate] = await ctx.db
      .select({
        quantity: bioremediationContSoilTable.estimated_quantity,
        oilZapperQuantity: bioremediationContSoilTable.oil_zapper_quantity,
      })
      .from(bioremediationContSoilTable)
      .where(
        and(
          eq(bioremediationContSoilTable.work_order_site_id, siteId),
          eq(bioremediationContSoilTable.type, "estimate_sub-wo"),
        ),
      );
    if (!estimate) return null;
    if (activityKey === OIL_ZAPPER.KEY) {
      return estimate.oilZapperQuantity != null
        ? parseFloat(estimate.oilZapperQuantity)
        : null;
    }
    return parseFloat(estimate.quantity || "0");
  }

  if (!RESTORATION_ACTIVITIES.has(activityKey)) return null;

  const [rate] = await ctx.db
    .select({ quantity: scheduleOfRatesTable.estimated_quantity })
    .from(siteActivityTable)
    .innerJoin(
      scheduleOfRatesTable,
      eq(siteActivityTable.schedule_of_rates_id, scheduleOfRatesTable.id),
    )
    .where(
      and(
        eq(siteActivityTable.work_order_site_id, siteId),
        eq(siteActivityTable.activity, activityKey),
      ),
    );
  return rate ? parseFloat(rate.quantity || "0") : null;
}

async function computeIsExceeded(
  ctx: any,
  siteId: number,
  activityKey: string | null | undefined,
  newQuantity: string | null | undefined,
  excludeExpenseId?: number,
): Promise<boolean | null> {
  if (!activityKey || !newQuantity) return null;
  const newQty = parseFloat(newQuantity);
  if (!Number.isFinite(newQty) || newQty <= 0) return null;

  const estimateQty = await getEstimateQtyForSite(ctx, siteId, activityKey);
  if (estimateQty === null || estimateQty <= 0) return null;

  const whereClause = excludeExpenseId
    ? and(
        eq(workOrderSiteExpenseTable.work_order_site_id, siteId),
        eq(workOrderSiteExpenseTable.activity_key, activityKey),
        ne(workOrderSiteExpenseTable.id, excludeExpenseId),
      )
    : and(
        eq(workOrderSiteExpenseTable.work_order_site_id, siteId),
        eq(workOrderSiteExpenseTable.activity_key, activityKey),
      );

  const rows = await ctx.db
    .select({ total: sum(workOrderSiteExpenseTable.quantity) })
    .from(workOrderSiteExpenseTable)
    .where(whereClause);

  const existingTotal = Number(rows[0]?.total ?? 0);
  return existingTotal + newQty > estimateQty + 0.001;
}

// A restoration's miscellaneous expense, under none of its vendors, uses up
// no activity quantity, so it may not carry one.
async function assertQuantityAllowed(
  ctx: any,
  siteId: number,
  contractorId: number | null | undefined,
  quantity: string | null | undefined,
) {
  if (contractorId || !quantity || !(parseFloat(quantity) > 0)) return;

  const [site] = await ctx.db
    .select({ process_type: workOrderSiteTable.process_type })
    .from(workOrderSiteTable)
    .where(eq(workOrderSiteTable.id, siteId));
  if (site?.process_type === WO_PROCESS.RESTORATION) {
    throw businessRule(
      "Miscellaneous expenses don't record a quantity. Choose a vendor to deduct one.",
    );
  }
}

// An expense can't end before it starts.
const endsOnOrAfterStart = (value: { start_date?: string; end_date?: string }) =>
  !value.start_date ||
  !value.end_date ||
  new Date(value.end_date).getTime() >= new Date(value.start_date).getTime();

const endDateIssue = {
  message: "End date can't be before the start date",
  path: ["end_date"],
};

const createExpenseSchema = z.object({
  work_order_site_id: z.number().positive(),
  contractor_id: z.number().positive().optional().nullable(),
  activity_key: z.string().max(100).optional().nullable(),
  quantity: z.string().optional().nullable(),
  is_exceeded: z.boolean().optional().default(false),
  title: z.string().min(1, "Title is required").max(500),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    }),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  invoice_number: z.string().max(100).optional().nullable(),
  documents: validators.optionalDocumentsValidator.optional(),
}).refine(endsOnOrAfterStart, endDateIssue);

const updateExpenseSchema = z.object({
  id: z.number().positive(),
  contractor_id: z.number().positive().optional().nullable(),
  activity_key: z.string().max(100).optional().nullable(),
  quantity: z.string().optional().nullable(),
  is_exceeded: z.boolean().optional(),
  title: z.string().min(1).max(500).optional(),
  amount: z
    .string()
    .refine((v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    })
    .optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  invoice_number: z.string().max(100).optional().nullable(),
  documents: validators.optionalDocumentsValidator.optional(),
}).refine(endsOnOrAfterStart, endDateIssue);

export const expenseMutationRouter = router({
  createExpense: protectedProcedure
    .input(createExpenseSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertQuantityAllowed(
          ctx,
          input.work_order_site_id,
          input.contractor_id,
          input.quantity,
        );

        try {
          const userId = ctx.user ? Number(ctx.user.sub) : null;

          const autoExceeded = await computeIsExceeded(
            ctx,
            input.work_order_site_id,
            input.activity_key,
            input.quantity,
          );
          const finalExceeded =
            autoExceeded !== null ? autoExceeded : !!input.is_exceeded;

          const [created] = await ctx.db
            .insert(workOrderSiteExpenseTable)
            .values({
              work_order_site_id: input.work_order_site_id,
              contractor_id: input.contractor_id ?? null,
              activity_key: input.activity_key ?? null,
              quantity: input.quantity ?? null,
              is_exceeded: finalExceeded ? 1 : 0,
              title: input.title,
              amount: input.amount,
              start_date: new Date(input.start_date),
              end_date: new Date(input.end_date),
              invoice_number: input.invoice_number ?? null,
              documents: input.documents ?? [],
              // Legacy single-document columns, kept until they are dropped.
              document_url: input.documents?.[0]?.url ?? null,
              document_id: input.documents?.[0]?.id ?? null,
              created_by: userId,
            })
            .$returningId();

          if (!created) {
            throw notFound("Expense", undefined, {
              userMessage: "Failed to create expense. Please try again.",
            });
          }

          await syncRestorationCompletion(ctx.db, input.work_order_site_id);

          return { success: true, id: created.id };
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error) throw error;
          throw fromDatabaseError(error, "Creating expense");
        }
      }),
    ),

  updateExpense: protectedProcedure
    .input(updateExpenseSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { id, ...updateData } = input;

        const existing = await ctx.db
          .select()
          .from(workOrderSiteExpenseTable)
          .where(eq(workOrderSiteExpenseTable.id, id));

        if (existing.length === 0) {
          throw notFound("Expense", id);
        }

        // Checked only when the update touches the vendor or the quantity.
        if (updateData.contractor_id !== undefined || updateData.quantity !== undefined) {
          const before = existing[0]!;
          await assertQuantityAllowed(
            ctx,
            before.work_order_site_id,
            updateData.contractor_id !== undefined
              ? updateData.contractor_id
              : before.contractor_id,
            updateData.quantity !== undefined ? updateData.quantity : before.quantity,
          );
        }

        try {
          const setData: Record<string, unknown> = {};
          if (updateData.contractor_id !== undefined) setData.contractor_id = updateData.contractor_id;
          if (updateData.activity_key !== undefined) setData.activity_key = updateData.activity_key;
          if (updateData.quantity !== undefined) setData.quantity = updateData.quantity;

          const prev = existing[0]!;
          const effectiveActivityKey =
            updateData.activity_key !== undefined
              ? updateData.activity_key
              : prev.activity_key;
          const effectiveQuantity =
            updateData.quantity !== undefined ? updateData.quantity : prev.quantity;
          const autoExceeded = await computeIsExceeded(
            ctx,
            prev.work_order_site_id,
            effectiveActivityKey,
            effectiveQuantity,
            id,
          );
          if (autoExceeded !== null) {
            setData.is_exceeded = autoExceeded ? 1 : 0;
          } else if (updateData.is_exceeded !== undefined) {
            setData.is_exceeded = updateData.is_exceeded ? 1 : 0;
          }
          if (updateData.title !== undefined) setData.title = updateData.title;
          if (updateData.amount !== undefined) setData.amount = updateData.amount;
          if (updateData.start_date !== undefined) setData.start_date = new Date(updateData.start_date);
          if (updateData.end_date !== undefined) setData.end_date = new Date(updateData.end_date);
          if (updateData.invoice_number !== undefined) setData.invoice_number = updateData.invoice_number;
          if (updateData.documents !== undefined) {
            setData.documents = updateData.documents;
            setData.document_url = updateData.documents[0]?.url ?? null;
            setData.document_id = updateData.documents[0]?.id ?? null;
          }

          await ctx.db
            .update(workOrderSiteExpenseTable)
            .set(setData)
            .where(eq(workOrderSiteExpenseTable.id, id));

          await syncRestorationCompletion(ctx.db, prev.work_order_site_id);

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Updating expense");
        }
      }),
    ),

  deleteExpense: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const existing = await ctx.db
          .select()
          .from(workOrderSiteExpenseTable)
          .where(eq(workOrderSiteExpenseTable.id, input.id));

        if (existing.length === 0) {
          throw notFound("Expense", input.id);
        }

        try {
          await ctx.db
            .delete(workOrderSiteExpenseTable)
            .where(eq(workOrderSiteExpenseTable.id, input.id));

          await syncRestorationCompletion(ctx.db, existing[0]!.work_order_site_id);

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting expense");
        }
      }),
    ),
});

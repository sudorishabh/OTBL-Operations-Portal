import { and, eq, ne, sum } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { z } from "zod";

const {
  workOrderSiteExpenseTable,
  cleaningUpSoilAreaTable,
  liftingRecoveryOilSlushTable,
  excavationContSoilTable,
  transportationContSoilTable,
  refillingExcavatedContSoilTable,
  bioremediationContSoilTable,
} = schema;

const activityTableByKey: Record<string, any> = {
  clean_soil_area: cleaningUpSoilAreaTable,
  lifting_oily_slush_or_recovery_of_oil: liftingRecoveryOilSlushTable,
  excavation_oil_contaminated_soil: excavationContSoilTable,
  transportation_contaminated_soil: transportationContSoilTable,
  refilling_excavated_oil_contaminated_soil_land:
    refillingExcavatedContSoilTable,
  bioremediation_oil_contaminated_soil: bioremediationContSoilTable,
};

async function getEstimateQtyForSite(
  ctx: any,
  siteId: number,
  activityKey: string,
): Promise<number | null> {
  const table = activityTableByKey[activityKey];
  if (!table) return null;
  const rows = await ctx.db
    .select()
    .from(table)
    .where(
      and(
        eq(table.work_order_site_id, siteId),
        eq(table.type, "estimate_sub-wo"),
      ),
    );
  if (rows.length === 0) return null;
  return parseFloat(rows[0].estimated_quantity || "0");
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

const expenseTypeEnum = z.enum([
  "contractor_payment",
  "labour",
  "material",
  "equipment",
  "miscellaneous",
]);

const createExpenseSchema = z.object({
  work_order_site_id: z.number().positive(),
  expense_type: expenseTypeEnum,
  contractor_id: z.number().positive().optional().nullable(),
  activity_key: z.string().max(100).optional().nullable(),
  quantity: z.string().optional().nullable(),
  is_exceeded: z.boolean().optional().default(false),
  description: z.string().min(1, "Description is required").max(500),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    }),
  expense_date: z.string().min(1, "Date is required"),
  invoice_number: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  document_url: z.string().max(500).optional().nullable(),
  document_id: z.string().max(255).optional().nullable(),
});

const updateExpenseSchema = z.object({
  id: z.number().positive(),
  expense_type: expenseTypeEnum.optional(),
  contractor_id: z.number().positive().optional().nullable(),
  activity_key: z.string().max(100).optional().nullable(),
  quantity: z.string().optional().nullable(),
  is_exceeded: z.boolean().optional(),
  description: z.string().min(1).max(500).optional(),
  amount: z
    .string()
    .refine((v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Amount must be a positive number",
    })
    .optional(),
  expense_date: z.string().optional(),
  invoice_number: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  document_url: z.string().max(500).optional().nullable(),
  document_id: z.string().max(255).optional().nullable(),
});

export const expenseMutationRouter = router({
  createExpense: protectedProcedure
    .input(createExpenseSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
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
              expense_type: input.expense_type,
              contractor_id: input.contractor_id ?? null,
              activity_key: input.activity_key ?? null,
              quantity: input.quantity ?? null,
              is_exceeded: finalExceeded ? 1 : 0,
              description: input.description,
              amount: input.amount,
              expense_date: new Date(input.expense_date),
              invoice_number: input.invoice_number ?? null,
              notes: input.notes ?? null,
              document_url: input.document_url ?? null,
              document_id: input.document_id ?? null,
              created_by: userId,
            })
            .$returningId();

          if (!created) {
            throw notFound("Expense", undefined, {
              userMessage: "Failed to create expense. Please try again.",
            });
          }

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

        try {
          const setData: Record<string, unknown> = {};
          if (updateData.expense_type !== undefined) setData.expense_type = updateData.expense_type;
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
          if (updateData.description !== undefined) setData.description = updateData.description;
          if (updateData.amount !== undefined) setData.amount = updateData.amount;
          if (updateData.expense_date !== undefined) setData.expense_date = new Date(updateData.expense_date);
          if (updateData.invoice_number !== undefined) setData.invoice_number = updateData.invoice_number;
          if (updateData.notes !== undefined) setData.notes = updateData.notes;
          if (updateData.document_url !== undefined) setData.document_url = updateData.document_url;
          if (updateData.document_id !== undefined) setData.document_id = updateData.document_id;

          await ctx.db
            .update(workOrderSiteExpenseTable)
            .set(setData)
            .where(eq(workOrderSiteExpenseTable.id, id));

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

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting expense");
        }
      }),
    ),
});

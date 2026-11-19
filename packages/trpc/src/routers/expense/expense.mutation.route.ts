import { and, count, eq, ne, sum } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { businessRule, fromDatabaseError, notFound } from "../../errors";
import { handleMutation } from "../../helper/typed-handler";
import { z } from "zod";
import { validators } from "@pkg/schema";
import { constants } from "@pkg/utils";
import {
  getOilZapperStock,
  OIL_ZAPPER_EPSILON,
} from "../work-order-site/oil-zapper-stock";
import { subContractAmount } from "../contract-order/sub-contract-expenses";

const {
  workOrderSiteTable,
  workOrderSiteExpenseTable,
  bioremediationContSoilTable,
  siteActivityTable,
  scheduleOfRatesTable,
  contractOrderTable,
  contractOrderItemTable,
  contractOrderContractorTable,
  jobOrderTable,
  jobOrderContractorTable,
} = schema;

const {
  WO_ACTIVITIES,
  WO_PROCESS,
  OIL_ZAPPER,
  CONTRACT_ORDER_TYPE,
  allActivityOptions,
} = constants;

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

// A miscellaneous expense, under none of a restoration's or bioremediation
// site's vendors, uses up no activity quantity or procures oil zapper, so it
// may not carry one.
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
  if (site?.process_type === WO_PROCESS.BIOREMEDIATION) {
    throw businessRule(
      "Miscellaneous expenses don't procure oil zapper. Choose a vendor to record it.",
    );
  }
}

// The oil zapper an expense procures, if it is an oil zapper expense.
const procuredOilZapper = (
  activityKey: string | null | undefined,
  quantity: string | null | undefined,
) => (activityKey === OIL_ZAPPER.KEY ? parseFloat(quantity ?? "0") || 0 : 0);

// A site's procured oil zapper can't drop below what its oil zapping entries
// have already applied.
async function assertProcuredCoversUsed(
  ctx: any,
  siteId: number,
  procuredChange: number,
) {
  if (procuredChange >= 0) return;

  const stock = await getOilZapperStock(ctx.db, siteId);
  if (stock.procured + procuredChange + OIL_ZAPPER_EPSILON < stock.used) {
    throw businessRule(
      `${stock.used.toFixed(2)} ${OIL_ZAPPER.UNIT} of oil zapper has already been applied on this site, so its procured quantity can't drop below that.`,
    );
  }
}

// An expense its purchase order recorded changes only with the order.
const assertNotFromOrder = (expense: { from_order: number }) => {
  if (expense.from_order) {
    throw businessRule(
      "This expense is recorded by its purchase order. Edit the order to change it.",
    );
  }
};

// What an expense takes from the order requirement it is spent on: the
// activity key to store, and the rate that prices it, if the requirement has
// one.
type OrderItemTerms = {
  activityKey: string | null;
  unitRate: number | null;
};

// An expense spent on a contract order requirement must be for one at its
// site, under one of that order's vendors. Oil zapper bought this way is
// procured oil zapper; nothing else is. A single-expense sub-contract's
// requirement takes only one, besides the one being edited.
async function resolveOrderItem(
  ctx: any,
  siteId: number,
  itemId: number | null | undefined,
  contractorId: number | null | undefined,
  activityKey: string | null | undefined,
  editingId?: number,
): Promise<OrderItemTerms> {
  if (!itemId) return { activityKey: activityKey ?? null, unitRate: null };

  const [item] = await ctx.db
    .select({
      work_order_site_id: contractOrderItemTable.work_order_site_id,
      contract_order_id: contractOrderItemTable.contract_order_id,
      item: contractOrderItemTable.item,
      unit_rate: contractOrderItemTable.unit_rate,
      order_type: contractOrderTable.type,
      single_expense: contractOrderTable.single_expense,
    })
    .from(contractOrderItemTable)
    .innerJoin(
      contractOrderTable,
      eq(contractOrderItemTable.contract_order_id, contractOrderTable.id),
    )
    .where(eq(contractOrderItemTable.id, itemId));

  if (!item || item.work_order_site_id !== siteId) {
    throw businessRule("That order requirement isn't for this site.");
  }
  // A purchase order records its own cost, from its rate.
  if (item.order_type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER) {
    throw businessRule(
      "A purchase order's cost is recorded from its rate. Edit the order to change it.",
    );
  }
  if (!contractorId) {
    throw businessRule("Choose which of the order's vendors this expense is under.");
  }

  const [vendor] = await ctx.db
    .select({ id: contractOrderContractorTable.id })
    .from(contractOrderContractorTable)
    .where(
      and(
        eq(contractOrderContractorTable.contract_order_id, item.contract_order_id),
        eq(contractOrderContractorTable.contractor_id, contractorId),
      ),
    );
  if (!vendor) {
    throw businessRule("That vendor isn't on this expense's order.");
  }

  if (item.single_expense) {
    const [recorded] = await ctx.db
      .select({ total: count() })
      .from(workOrderSiteExpenseTable)
      .where(
        and(
          eq(workOrderSiteExpenseTable.contract_order_item_id, itemId),
          eq(workOrderSiteExpenseTable.from_order, 0),
          editingId ? ne(workOrderSiteExpenseTable.id, editingId) : undefined,
        ),
      );
    if ((recorded?.total ?? 0) > 0) {
      throw businessRule(
        "This requirement takes one expense, with its total quantity, and already has it. Edit that expense instead.",
      );
    }
  }

  return {
    activityKey: item.item === OIL_ZAPPER.KEY ? OIL_ZAPPER.KEY : null,
    unitRate: item.unit_rate ? Number(item.unit_rate) : null,
  };
}

// An expense on a rated requirement costs its quantity at the rate, so it
// must give one. Null for any other, which keeps the amount entered.
const pricedAmount = (
  unitRate: number | null,
  quantity: string | null | undefined,
): string | null => {
  if (unitRate === null) return null;
  const qty = parseFloat(quantity ?? "");
  if (!(qty > 0)) {
    throw businessRule(
      "Enter the quantity worked, which the requirement's rate prices.",
    );
  }
  return subContractAmount(qty, unitRate);
};

// A restoration vendor expense is spent on one of its job orders, under one
// of that job order's vendors; a miscellaneous one is on none.
async function assertJobOrderAllowed(
  ctx: any,
  siteId: number,
  jobOrderId: number | null | undefined,
  contractorId: number | null | undefined,
) {
  if (!jobOrderId) {
    if (!contractorId) return;
    const [site] = await ctx.db
      .select({ process_type: workOrderSiteTable.process_type })
      .from(workOrderSiteTable)
      .where(eq(workOrderSiteTable.id, siteId));
    if (site?.process_type === WO_PROCESS.RESTORATION) {
      throw businessRule("Choose the job order this vendor expense is on.");
    }
    return;
  }

  const [jobOrder] = await ctx.db
    .select({ work_order_site_id: jobOrderTable.work_order_site_id })
    .from(jobOrderTable)
    .where(eq(jobOrderTable.id, jobOrderId));
  if (!jobOrder || jobOrder.work_order_site_id !== siteId) {
    throw businessRule("That job order isn't under this restoration.");
  }
  if (!contractorId) {
    throw businessRule("Choose which of the job order's vendors this expense is under.");
  }

  const [vendor] = await ctx.db
    .select({ id: jobOrderContractorTable.id })
    .from(jobOrderContractorTable)
    .where(
      and(
        eq(jobOrderContractorTable.job_order_id, jobOrderId),
        eq(jobOrderContractorTable.contractor_id, contractorId),
      ),
    );
  if (!vendor) {
    throw businessRule("That vendor isn't on this expense's job order.");
  }
}

// A job order closes once its completion certificate is uploaded: expenses
// can then no longer be added to it, changed or deleted. Removing the
// certificate reopens it.
async function assertJobOrderOpen(
  ctx: any,
  jobOrderId: number | null | undefined,
) {
  if (!jobOrderId) return;

  const [jobOrder] = await ctx.db
    .select({
      jo_number: jobOrderTable.jo_number,
      documents: jobOrderTable.documents,
    })
    .from(jobOrderTable)
    .where(eq(jobOrderTable.id, jobOrderId));
  if (jobOrder && (jobOrder.documents?.length ?? 0) > 0) {
    throw businessRule(
      `Job order ${jobOrder.jo_number} is closed, as its completion certificate is uploaded. Remove the certificate to reopen it.`,
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

const amountValidator = z
  .string()
  .min(1, "Amount is required")
  .refine((v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0, {
    message: "Amount must be a positive number",
  });

// A new expense's row. Its documents also fill the legacy single-document
// columns, kept until they are dropped.
const newExpenseRow = (
  expense: {
    work_order_site_id: number;
    contractor_id?: number | null;
    contract_order_item_id?: number | null;
    job_order_id?: number | null;
    quantity?: string | null;
    title: string;
    amount: string;
    start_date: string;
    end_date: string;
    invoice_number?: string | null;
    documents?: { url: string; id?: string | null; name?: string | null }[];
  },
  activityKey: string | null,
  isExceeded: boolean,
  userId: number | null,
) => ({
  work_order_site_id: expense.work_order_site_id,
  contractor_id: expense.contractor_id ?? null,
  contract_order_item_id: expense.contract_order_item_id ?? null,
  job_order_id: expense.job_order_id ?? null,
  activity_key: activityKey,
  quantity: expense.quantity ?? null,
  is_exceeded: isExceeded ? 1 : 0,
  title: expense.title,
  amount: expense.amount,
  start_date: new Date(expense.start_date),
  end_date: new Date(expense.end_date),
  invoice_number: expense.invoice_number ?? null,
  documents: expense.documents ?? [],
  document_url: expense.documents?.[0]?.url ?? null,
  document_id: expense.documents?.[0]?.id ?? null,
  created_by: userId,
});

const createExpenseSchema = z.object({
  work_order_site_id: z.number().positive(),
  contractor_id: z.number().positive().optional().nullable(),
  contract_order_item_id: z.number().positive().optional().nullable(),
  job_order_id: z.number().positive().optional().nullable(),
  activity_key: z.string().max(100).optional().nullable(),
  quantity: z.string().optional().nullable(),
  is_exceeded: z.boolean().optional().default(false),
  title: z.string().min(1, "Title is required").max(500),
  amount: amountValidator,
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  invoice_number: z.string().max(100).optional().nullable(),
  documents: validators.optionalDocumentsValidator.optional(),
}).refine(endsOnOrAfterStart, endDateIssue);

// Several of a job order's activities recorded at once, under one of its
// vendors: one expense for each activity, sharing the rest.
const createJobOrderExpensesSchema = z
  .object({
    work_order_site_id: z.number().positive(),
    job_order_id: z.number().positive(),
    contractor_id: z.number().positive(),
    title: z.string().min(1, "Title is required").max(500),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    invoice_number: z.string().max(100).optional().nullable(),
    documents: validators.optionalDocumentsValidator.optional(),
    lines: z
      .array(
        z.object({
          activity_key: z.string().min(1, "Choose each line's activity").max(100),
          quantity: z.string().optional().nullable(),
          amount: amountValidator,
          // For an activity whose quantity is already used up.
          is_exceeded: z.boolean().optional().default(false),
        }),
      )
      .min(1, "Add at least one activity")
      .max(50),
  })
  .refine(endsOnOrAfterStart, endDateIssue)
  .refine(
    (value) =>
      new Set(value.lines.map((line) => line.activity_key)).size ===
      value.lines.length,
    { message: "Give each activity one line", path: ["lines"] },
  );

const updateExpenseSchema = z.object({
  id: z.number().positive(),
  contractor_id: z.number().positive().optional().nullable(),
  contract_order_item_id: z.number().positive().optional().nullable(),
  job_order_id: z.number().positive().optional().nullable(),
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
        const { activityKey, unitRate } = await resolveOrderItem(
          ctx,
          input.work_order_site_id,
          input.contract_order_item_id,
          input.contractor_id,
          input.activity_key,
        );
        const amount = pricedAmount(unitRate, input.quantity) ?? input.amount;
        await assertJobOrderAllowed(
          ctx,
          input.work_order_site_id,
          input.job_order_id,
          input.contractor_id,
        );
        await assertJobOrderOpen(ctx, input.job_order_id);

        try {
          const userId = ctx.user ? Number(ctx.user.sub) : null;

          const autoExceeded = await computeIsExceeded(
            ctx,
            input.work_order_site_id,
            activityKey,
            input.quantity,
          );
          const finalExceeded =
            autoExceeded !== null ? autoExceeded : !!input.is_exceeded;

          const [created] = await ctx.db
            .insert(workOrderSiteExpenseTable)
            .values(
              newExpenseRow(
                { ...input, amount },
                activityKey,
                finalExceeded,
                userId,
              ),
            )
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

  createJobOrderExpenses: protectedProcedure
    .input(createJobOrderExpensesSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertJobOrderAllowed(
          ctx,
          input.work_order_site_id,
          input.job_order_id,
          input.contractor_id,
        );
        await assertJobOrderOpen(ctx, input.job_order_id);

        try {
          const userId = ctx.user ? Number(ctx.user.sub) : null;
          const { lines, ...shared } = input;

          // All of them or none.
          const ids = await ctx.db.transaction(async (tx) => {
            const created: number[] = [];
            for (const line of lines) {
              const autoExceeded = await computeIsExceeded(
                { ...ctx, db: tx },
                input.work_order_site_id,
                line.activity_key,
                line.quantity,
              );
              const [row] = await tx
                .insert(workOrderSiteExpenseTable)
                .values(
                  newExpenseRow(
                    { ...shared, quantity: line.quantity, amount: line.amount },
                    line.activity_key,
                    autoExceeded !== null ? autoExceeded : line.is_exceeded,
                    userId,
                  ),
                )
                .$returningId();
              if (row) created.push(row.id);
            }
            return created;
          });

          return { success: true, ids };
        } catch (error) {
          throw fromDatabaseError(error, "Recording job order expenses");
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

        const prev = existing[0]!;
        assertNotFromOrder(prev);
        await assertJobOrderOpen(ctx, prev.job_order_id);
        if (updateData.job_order_id !== prev.job_order_id) {
          await assertJobOrderOpen(ctx, updateData.job_order_id);
        }
        const effectiveQuantity =
          updateData.quantity !== undefined ? updateData.quantity : prev.quantity;
        const effectiveItemId =
          updateData.contract_order_item_id !== undefined
            ? updateData.contract_order_item_id
            : prev.contract_order_item_id;
        const { activityKey: effectiveActivityKey, unitRate } =
          await resolveOrderItem(
            ctx,
            prev.work_order_site_id,
            effectiveItemId,
            updateData.contractor_id !== undefined
              ? updateData.contractor_id
              : prev.contractor_id,
            updateData.activity_key !== undefined
              ? updateData.activity_key
              : prev.activity_key,
            id,
          );
        const amount =
          pricedAmount(unitRate, effectiveQuantity) ?? updateData.amount;

        // Checked only when the update touches the vendor or the quantity.
        if (updateData.contractor_id !== undefined || updateData.quantity !== undefined) {
          await assertQuantityAllowed(
            ctx,
            prev.work_order_site_id,
            updateData.contractor_id !== undefined
              ? updateData.contractor_id
              : prev.contractor_id,
            effectiveQuantity,
          );
        }

        await assertProcuredCoversUsed(
          ctx,
          prev.work_order_site_id,
          procuredOilZapper(effectiveActivityKey, effectiveQuantity) -
            procuredOilZapper(prev.activity_key, prev.quantity),
        );
        await assertJobOrderAllowed(
          ctx,
          prev.work_order_site_id,
          updateData.job_order_id !== undefined
            ? updateData.job_order_id
            : prev.job_order_id,
          updateData.contractor_id !== undefined
            ? updateData.contractor_id
            : prev.contractor_id,
        );

        try {
          const setData: Record<string, unknown> = {};
          if (updateData.contractor_id !== undefined) setData.contractor_id = updateData.contractor_id;
          if (updateData.contract_order_item_id !== undefined) {
            setData.contract_order_item_id = updateData.contract_order_item_id;
          }
          if (updateData.job_order_id !== undefined) {
            setData.job_order_id = updateData.job_order_id;
          }
          if (effectiveActivityKey !== prev.activity_key) setData.activity_key = effectiveActivityKey;
          if (updateData.quantity !== undefined) setData.quantity = updateData.quantity;

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
          if (amount !== undefined) setData.amount = amount;
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

        const expense = existing[0]!;
        assertNotFromOrder(expense);
        await assertJobOrderOpen(ctx, expense.job_order_id);
        await assertProcuredCoversUsed(
          ctx,
          expense.work_order_site_id,
          -procuredOilZapper(expense.activity_key, expense.quantity),
        );

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

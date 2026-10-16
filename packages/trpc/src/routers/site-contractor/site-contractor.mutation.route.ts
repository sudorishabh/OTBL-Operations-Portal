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
import { keepsOwnContractors } from "./site-contractor-scope";

const {
  workOrderTable,
  workOrderSiteTable,
  workOrderSiteContractorTable,
  workOrderSiteExpenseTable,
  contractorTable,
} = schema;
const { STATUS } = constants;

// Only the office manager of the work order's office changes who a site's
// work is ordered to.
async function assertManagesSiteContractors(
  ctx: TrpcContext,
  workOrderSiteId: number,
) {
  const [site] = await ctx.db
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

  if (!site) {
    throw notFound("Work order site", workOrderSiteId);
  }
  if (!keepsOwnContractors(site.process_type)) {
    throw businessRule("This site doesn't keep its own vendors.");
  }

  await assertOfficeManager(ctx, site.office_id);
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

const siteContractorInput = z.object({
  work_order_site_id: z.number().positive(),
  contractor_id: z.number().positive(),
});

export const siteContractorMutationRouter = router({
  // Adds a vendor to the contractors a restoration or bioremediation site is
  // ordered to.
  addSiteContractor: protectedProcedure
    .input(siteContractorInput)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertManagesSiteContractors(ctx, input.work_order_site_id);
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
          throw fromDatabaseError(error, "Adding the site contractor");
        }
      }),
    ),

  // Removes a contractor, as long as no expenses are recorded under it.
  removeSiteContractor: protectedProcedure
    .input(siteContractorInput)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        await assertManagesSiteContractors(ctx, input.work_order_site_id);

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
          throw fromDatabaseError(error, "Removing the site contractor");
        }
      }),
    ),
});

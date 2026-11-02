import { asc, eq, inArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { jobOrderSchemas } from "@pkg/schema";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessWorkOrderSite,
  getAccessScope,
} from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";

const { contractorTable, jobOrderTable, jobOrderContractorTable } = schema;

export const jobOrderQueryRouter = router({
  // A restoration's job orders, earliest first, each with its vendors.
  getJobOrders: protectedProcedure
    .input(jobOrderSchemas.getJobOrdersSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrderSite(
          ctx.db,
          scope,
          input.work_order_site_id,
        );

        try {
          const jobOrders = await ctx.db
            .select()
            .from(jobOrderTable)
            .where(eq(jobOrderTable.work_order_site_id, input.work_order_site_id))
            .orderBy(asc(jobOrderTable.start_date), asc(jobOrderTable.id));
          if (jobOrders.length === 0) return [];

          const vendors = await ctx.db
            .select({
              job_order_id: jobOrderContractorTable.job_order_id,
              id: contractorTable.id,
              name: contractorTable.name,
            })
            .from(jobOrderContractorTable)
            .innerJoin(
              contractorTable,
              eq(jobOrderContractorTable.contractor_id, contractorTable.id),
            )
            .where(
              inArray(
                jobOrderContractorTable.job_order_id,
                jobOrders.map((jobOrder) => jobOrder.id),
              ),
            )
            .orderBy(asc(contractorTable.name));

          return jobOrders.map((jobOrder) => ({
            ...jobOrder,
            vendors: vendors
              .filter((vendor) => vendor.job_order_id === jobOrder.id)
              .map(({ id, name }) => ({ id, name })),
          }));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching job orders");
        }
      }),
    ),
});

import { asc, eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import { assertCanAccessWorkOrder, getAccessScope } from "../../access-scope";
import { fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { z } from "zod";
import { restorationRowWhere } from "./restoration-row";

const { workOrderSiteTable, workOrderSiteContractorTable, contractorTable } =
  schema;

export const restorationQueryRouter = router({
  // The work order's restoration row, or null until it is set up.
  getRestoration: protectedProcedure
    .input(z.object({ work_order_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrder(ctx.db, scope, input.work_order_id);

        try {
          const [row] = await ctx.db
            .select({
              id: workOrderSiteTable.id,
              status: workOrderSiteTable.status,
              is_completed: workOrderSiteTable.is_completed,
            })
            .from(workOrderSiteTable)
            .where(restorationRowWhere(input.work_order_id))
            .limit(1);

          if (!row) return null;

          // Site operators only see the restoration they are assigned to.
          if (
            scope.kind === "restricted" &&
            scope.ui === "wo_site_upload" &&
            !scope.workOrderSiteIds.includes(row.id)
          ) {
            return null;
          }

          // Every vendor the restoration is ordered to, in the order assigned.
          const contractors = await ctx.db
            .select({
              id: contractorTable.id,
              name: contractorTable.name,
              contact_number: contractorTable.contact_number,
              email: contractorTable.email,
              gst_number: contractorTable.gst_number,
              status: contractorTable.status,
            })
            .from(workOrderSiteContractorTable)
            .innerJoin(
              contractorTable,
              eq(
                workOrderSiteContractorTable.contractor_id,
                contractorTable.id,
              ),
            )
            .where(eq(workOrderSiteContractorTable.work_order_site_id, row.id))
            .orderBy(asc(workOrderSiteContractorTable.id));

          return {
            id: row.id,
            status: row.status,
            is_completed: row.is_completed,
            contractors,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching restoration");
        }
      }),
    ),
});

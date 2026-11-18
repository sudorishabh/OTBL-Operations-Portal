"use client";
import React from "react";
import { certifiedQuantityByActivity } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { SkeletonRegion } from "@/components/skeleton/parts";
import { RestorationRatesTableSkeleton } from "@/components/skeleton/work-order/site-skeletons";
import type { JobOrder } from "./job-order-dialog";
import { QTY_EPSILON } from "./restoration-display";
import RestorationRatesTable, {
  type RestorationRate,
} from "./restoration-rates-table";

interface Props {
  restorationId: number;
  rates: RestorationRate[];
  estimatedTotal: number;
  className?: string;
}

// The restoration schedule of rates, kept in view on the restoration page:
// its activities in the order the work is done, with what the completion
// certificates have used, what the vendors have cost, and how many are done.
const RestorationRatesSection = ({
  restorationId,
  rates,
  estimatedTotal,
  className,
}: Props) => {
  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery({
    work_order_site_id: restorationId,
  });
  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery({
    work_order_site_id: restorationId,
  });
  const isLoading = jobOrdersQuery.isLoading || expenseSummaryQuery.isLoading;

  const certifiedByActivity = certifiedQuantityByActivity(
    (jobOrdersQuery.data ?? []) as JobOrder[],
  );
  const spentByActivity: Record<string, number> = Object.fromEntries(
    Object.entries(
      (expenseSummaryQuery.data?.byActivity ?? {}) as Record<
        string,
        { totalAmount: number }
      >,
    ).map(([activity, usage]) => [activity, usage.totalAmount]),
  );

  // An activity is done once the certificates use up its quantity.
  const doneCount = rates.filter(
    (rate) =>
      (certifiedByActivity[rate.activity] ?? 0) + QTY_EPSILON >=
      (Number(rate.estimated_quantity) || 0),
  ).length;

  return (
    <section className={className}>
      <div className='mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
        <div className='min-w-0'>
          <h3 className='text-sm font-semibold text-gray-900'>
            Schedule of Rates
          </h3>
          <p className='text-xs text-gray-500'>
            The restoration activities in the order the work is done, with what
            the completion certificates have used and the vendors have cost.
          </p>
        </div>
        {rates.length > 0 && !isLoading && (
          <p className='shrink-0 text-xs text-gray-500'>
            <span className='font-semibold tabular-nums text-gray-900'>
              {doneCount} of {rates.length}
            </span>{" "}
            {rates.length === 1 ? "activity" : "activities"} certified done
          </p>
        )}
      </div>

      {isLoading ? (
        <SkeletonRegion label='Loading the schedule of rates'>
          <RestorationRatesTableSkeleton rows={rates.length} />
        </SkeletonRegion>
      ) : (
        <RestorationRatesTable
          rates={rates}
          estimatedTotal={estimatedTotal}
          certifiedByActivity={certifiedByActivity}
          spentByActivity={spentByActivity}
          totalSpent={expenseSummaryQuery.data?.grandTotal ?? 0}
        />
      )}
    </section>
  );
};

export default RestorationRatesSection;

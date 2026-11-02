"use client";
import React from "react";
import { Rows3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { QTY_EPSILON } from "./restoration-display";
import RestorationRatesTable, {
  type ActivityUsage,
  type RestorationRate,
} from "./restoration-rates-table";

interface Props {
  restorationId: number;
  rates: RestorationRate[];
  estimatedTotal: number;
  className?: string;
}

// The restoration schedule of rates, with the quantity and money its expenses
// have used, and how many activities are done.
const RestorationRatesSection = ({
  restorationId,
  rates,
  estimatedTotal,
  className,
}: Props) => {
  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery({
    work_order_site_id: restorationId,
  });
  const usageByActivity: Record<string, ActivityUsage> =
    expenseSummaryQuery.data?.byActivity ?? {};

  // An activity is done once its expenses use up its estimated quantity.
  const doneCount = rates.filter(
    (rate) =>
      (usageByActivity[rate.activity]?.totalQuantity ?? 0) + QTY_EPSILON >=
      (Number(rate.estimated_quantity) || 0),
  ).length;

  return (
    <section className={cn("space-y-3", className)}>
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-1'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
          <Rows3 className='size-3.5 text-gray-400' />
          <h2 className='text-[13px] font-semibold text-gray-800'>
            Schedule of rates
          </h2>
          <span className='text-xs text-gray-400'>
            in the order the work is done
          </span>
        </div>
        <p className='text-xs text-gray-500'>
          <span className='font-semibold tabular-nums text-gray-900'>
            {doneCount} of {rates.length}
          </span>{" "}
          {rates.length === 1 ? "activity" : "activities"} done
        </p>
      </div>

      <RestorationRatesTable
        rates={rates}
        estimatedTotal={estimatedTotal}
        usageByActivity={usageByActivity}
        totalSpent={expenseSummaryQuery.data?.grandTotal ?? 0}
      />
    </section>
  );
};

export default RestorationRatesSection;

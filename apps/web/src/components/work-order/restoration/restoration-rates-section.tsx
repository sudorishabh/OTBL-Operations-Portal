"use client";
import React from "react";
import { Rows3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import CollapsiblePreview from "@/components/shared/collapsible-preview";
import RestorationRatesTable, {
  type RestorationRate,
} from "./restoration-rates-table";

interface Props {
  restorationId: number;
  rates: RestorationRate[];
  estimatedTotal: number;
}

// The restoration schedule of rates, with the quantity its expenses have
// used, shown half height until opened.
const RestorationRatesSection = ({
  restorationId,
  rates,
  estimatedTotal,
}: Props) => {
  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery({
    work_order_site_id: restorationId,
  });
  const byActivity: Record<string, { totalQuantity: number }> =
    expenseSummaryQuery.data?.byActivity ?? {};
  const usedQtyByActivity = Object.fromEntries(
    Object.entries(byActivity).map(([activity, totals]) => [
      activity,
      totals.totalQuantity,
    ]),
  );

  return (
    <section className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Rows3 className='size-4 text-gray-400' />
        <h3 className='text-sm font-semibold text-gray-700'>
          Schedule of Rates
        </h3>
      </div>
      <CollapsiblePreview expandLabel={`Show all ${rates.length} activities`}>
        <RestorationRatesTable
          rates={rates}
          estimatedTotal={estimatedTotal}
          usedQtyByActivity={usedQtyByActivity}
        />
      </CollapsiblePreview>
    </section>
  );
};

export default RestorationRatesSection;

"use client";
import React from "react";
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
    <CollapsiblePreview expandLabel={`Show all ${rates.length} activities`}>
      <RestorationRatesTable
        rates={rates}
        estimatedTotal={estimatedTotal}
        usedQtyByActivity={usedQtyByActivity}
      />
    </CollapsiblePreview>
  );
};

export default RestorationRatesSection;

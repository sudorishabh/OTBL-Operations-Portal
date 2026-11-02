"use client";
import React from "react";
import { trpc } from "@/lib/trpc";
import CollapsiblePreview from "@/components/shared/collapsible-preview";
import RestorationRatesTable, {
  type ActivityUsage,
  type RestorationRate,
} from "./restoration-rates-table";

interface Props {
  restorationId: number;
  rates: RestorationRate[];
  estimatedTotal: number;
}

// The restoration schedule of rates, with the quantity and money its expenses
// have used, shown half height until opened.
const RestorationRatesSection = ({
  restorationId,
  rates,
  estimatedTotal,
}: Props) => {
  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery({
    work_order_site_id: restorationId,
  });
  const usageByActivity: Record<string, ActivityUsage> =
    expenseSummaryQuery.data?.byActivity ?? {};

  return (
    <CollapsiblePreview expandLabel={`Show all ${rates.length} activities`}>
      <RestorationRatesTable
        rates={rates}
        estimatedTotal={estimatedTotal}
        usageByActivity={usageByActivity}
        totalSpent={expenseSummaryQuery.data?.grandTotal ?? 0}
      />
    </CollapsiblePreview>
  );
};

export default RestorationRatesSection;

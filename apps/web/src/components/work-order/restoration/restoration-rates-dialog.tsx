"use client";
import React from "react";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import DialogWindow from "@/components/shared/dialog-window";
import { QTY_EPSILON } from "./restoration-display";
import RestorationRatesTable, {
  type ActivityUsage,
  type RestorationRate,
} from "./restoration-rates-table";

export const RATES_DIALOG = "restoration-rates";

interface Props {
  restorationId: number;
  rates: RestorationRate[];
  estimatedTotal: number;
}

// The restoration schedule of rates, with the quantity and money its expenses
// have used, and how many activities are done.
const RestorationRatesDialog = ({
  restorationId,
  rates,
  estimatedTotal,
}: Props) => {
  const { getParam, deleteParam } = useHandleParams();
  const isOpen = getParam("dialog") === RATES_DIALOG;

  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery(
    { work_order_site_id: restorationId },
    { enabled: isOpen },
  );
  const usageByActivity: Record<string, ActivityUsage> =
    expenseSummaryQuery.data?.byActivity ?? {};

  // An activity is done once its expenses use up its estimated quantity.
  const doneCount = rates.filter(
    (rate) =>
      (usageByActivity[rate.activity]?.totalQuantity ?? 0) + QTY_EPSILON >=
      (Number(rate.estimated_quantity) || 0),
  ).length;

  return (
    <DialogWindow
      open={isOpen}
      setOpen={(open) => {
        if (!open) deleteParam("dialog");
      }}
      title='Schedule of Rates'
      description='The restoration activities in the order the work is done, with what their expenses have used.'
      size='xl'
      isLoading={expenseSummaryQuery.isLoading}>
      <div className='space-y-3 py-3'>
        <p className='text-xs text-gray-500'>
          <span className='font-semibold tabular-nums text-gray-900'>
            {doneCount} of {rates.length}
          </span>{" "}
          {rates.length === 1 ? "activity" : "activities"} done
        </p>
        <RestorationRatesTable
          rates={rates}
          estimatedTotal={estimatedTotal}
          usageByActivity={usageByActivity}
          totalSpent={expenseSummaryQuery.data?.grandTotal ?? 0}
        />
      </div>
    </DialogWindow>
  );
};

export default RestorationRatesDialog;

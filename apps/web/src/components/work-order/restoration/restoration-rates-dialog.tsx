"use client";
import React from "react";
import { certifiedQuantityByActivity } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import DialogWindow from "@/components/shared/dialog-window";
import type { JobOrder } from "./job-order-dialog";
import { QTY_EPSILON } from "./restoration-display";
import RestorationRatesTable, {
  type RestorationRate,
} from "./restoration-rates-table";

export const RATES_DIALOG = "restoration-rates";

interface Props {
  restorationId: number;
  rates: RestorationRate[];
  estimatedTotal: number;
}

// The restoration schedule of rates, with the quantities the completion
// certificates have used, what the vendors have cost, and how many activities
// are done.
const RestorationRatesDialog = ({
  restorationId,
  rates,
  estimatedTotal,
}: Props) => {
  const { getParam, deleteParam } = useHandleParams();
  const isOpen = getParam("dialog") === RATES_DIALOG;

  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery(
    { work_order_site_id: restorationId },
    { enabled: isOpen },
  );
  const expenseSummaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery(
    { work_order_site_id: restorationId },
    { enabled: isOpen },
  );

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
    <DialogWindow
      open={isOpen}
      setOpen={(open) => {
        if (!open) deleteParam("dialog");
      }}
      title='Schedule of Rates'
      description='The restoration activities in the order the work is done, with what the completion certificates have used and the vendors have cost.'
      size='xl'
      isLoading={jobOrdersQuery.isLoading || expenseSummaryQuery.isLoading}
      loadingSkeleton='list'>
      <div className='space-y-3 py-3'>
        <p className='text-xs text-gray-500'>
          <span className='font-semibold tabular-nums text-gray-900'>
            {doneCount} of {rates.length}
          </span>{" "}
          {rates.length === 1 ? "activity" : "activities"} certified done
        </p>
        <RestorationRatesTable
          rates={rates}
          estimatedTotal={estimatedTotal}
          certifiedByActivity={certifiedByActivity}
          spentByActivity={spentByActivity}
          totalSpent={expenseSummaryQuery.data?.grandTotal ?? 0}
        />
      </div>
    </DialogWindow>
  );
};

export default RestorationRatesDialog;

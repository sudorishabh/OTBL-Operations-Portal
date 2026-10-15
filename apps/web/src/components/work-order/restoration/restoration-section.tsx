"use client";
import React, { useMemo } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { capitalFirstLetter, constants } from "@pkg/utils";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateRange } from "@/lib/wo-site-display";
import useHandleParams from "@/hooks/useHandleParams";
import { useIsManager } from "@/contexts/AuthContext";
import CustomButton from "@/components/shared/btn";
import Error from "@/components/shared/error";
import { Skeleton } from "@/components/ui/skeleton";
import ProcessSectionHeader, { PROCESS_TONES } from "../process-section-header";
import RestorationDialog from "./restoration-dialog";
import type { RestorationRate } from "./restoration-rates-table";

const { allActivityOptions } = constants;

export type Restoration = NonNullable<
  RouterOutputs["restorationQuery"]["getRestoration"]
>;

interface Props {
  workOrder: any;
  scheduleOfRates: any[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

const fieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400";

// Restoration is done across the whole work order, so it has no sites: the
// section is one entry that opens the restoration dialog.
const RestorationSection = ({ workOrder, scheduleOfRates }: Props) => {
  const { setParam } = useHandleParams();
  const isManager = useIsManager();
  const utils = trpc.useUtils();

  const restorationQuery = trpc.restorationQuery.getRestoration.useQuery({
    work_order_id: workOrder.id,
  });
  const restoration = restorationQuery.data;

  const setUpMutation = trpc.restorationMutation.setUpRestoration.useMutation({
    onSuccess: () => {
      toast.success("Restoration set up");
      utils.restorationQuery.getRestoration.invalidate({
        work_order_id: workOrder.id,
      });
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  // The work order's restoration activities, in schedule of rates order.
  const rates = useMemo<RestorationRate[]>(
    () =>
      allActivityOptions
        .filter((option) => !option.isBioremediation)
        .flatMap((option) => {
          const sor = scheduleOfRates.find(
            (row) => row.activity === option.value,
          );
          return sor ? [{ ...sor, label: option.label }] : [];
        }),
    [scheduleOfRates],
  );

  const estimatedTotal = rates.reduce(
    (sum, rate) => sum + (Number(rate.total_cost) || 0),
    0,
  );

  const renderBody = () => {
    if (restorationQuery.isLoading) {
      return <Skeleton className='h-28 w-full rounded-xl' />;
    }

    if (restorationQuery.isError) {
      return (
        <Error
          variant='inline'
          message={
            restorationQuery.error.message || "Failed to load restoration"
          }
        />
      );
    }

    // Work orders created before restoration was set up automatically.
    if (!restoration) {
      return (
        <div className='flex flex-col items-start gap-3 rounded-xl border border-dashed border-gray-300 p-4 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-sm text-gray-600'>
            Restoration isn&apos;t set up for this work order yet.{" "}
            {isManager
              ? "Set it up to manage its operators, expenses and completion."
              : "The office manager can set it up."}
          </p>
          {isManager && (
            <CustomButton
              variant='primary'
              Icon={RotateCcw}
              text='Set up restoration'
              loading={setUpMutation.isPending}
              onClick={() =>
                setUpMutation.mutate({ work_order_id: workOrder.id })
              }
              disableForViewer
            />
          )}
        </div>
      );
    }

    const contractorNames = restoration.contractors
      .map((contractor: { name: string }) =>
        capitalFirstLetter(contractor.name),
      )
      .join(", ");

    return (
      <>
        <button
          type='button'
          onClick={() => setParam("dialog", "restoration")}
          className='group flex w-full flex-col rounded-xl border border-gray-200 bg-white p-3.5 text-left shadow-sm transition-all duration-200 hover:border-purple-300 hover:shadow-md focus-visible:border-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30'>
          <div className='flex w-full items-center gap-4'>
            <div className='min-w-0 flex-1'>
              <h3 className='text-[14px] font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-purple-700'>
                Restoration work
              </h3>
              <p className='mt-0.5 truncate text-[12px] text-gray-400'>
                {rates.length > 0
                  ? rates.map((rate) => rate.label).join(", ")
                  : "No restoration activities in the schedule of rates."}
              </p>
            </div>
            {rates.length > 0 && (
              <div className='shrink-0 text-right'>
                <div className={fieldLabelClass}>Estimated</div>
                <div className='mt-0.5 text-[13px] font-semibold tabular-nums text-gray-800'>
                  {formatCurrency(estimatedTotal)}
                </div>
              </div>
            )}
            <ArrowRight className='size-3.5 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-purple-600' />
          </div>

          <div className='mt-3 grid w-full grid-cols-2 gap-4 border-t border-gray-100 pt-3'>
            <div className='min-w-0'>
              <div className={fieldLabelClass}>Schedule</div>
              <div className='mt-0.5 text-[13px] font-medium text-gray-700'>
                {formatDateRange(workOrder.start_date, workOrder.end_date)}
              </div>
            </div>
            <div className='min-w-0'>
              <div className={fieldLabelClass}>Vendors</div>
              <div
                className='mt-0.5 truncate text-[13px] font-medium text-gray-700'
                title={contractorNames}>
                {contractorNames ? (
                  contractorNames
                ) : (
                  <span className='text-gray-400'>None yet</span>
                )}
              </div>
            </div>
          </div>
        </button>

        <RestorationDialog
          workOrder={workOrder}
          restoration={restoration}
          rates={rates}
          estimatedTotal={estimatedTotal}
        />
      </>
    );
  };

  return (
    <section
      className={cn(
        "rounded-lg border border-l-[3px] bg-white p-6",
        PROCESS_TONES.restoration.section,
      )}>
      <ProcessSectionHeader
        Icon={RotateCcw}
        tone='restoration'
        title='Restoration'
        description='Done across the whole work order, without sites.'
      />
      {renderBody()}
    </section>
  );
};

export default RestorationSection;

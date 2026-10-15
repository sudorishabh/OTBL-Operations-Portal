"use client";
import React, { useMemo } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";
import useHandleParams from "@/hooks/useHandleParams";
import ProcessSectionHeader, { PROCESS_TONES } from "../process-section-header";
import RestorationDialog, { RestorationRate } from "./restoration-dialog";

const { allActivityOptions } = constants;

interface Props {
  scheduleOfRates: any[];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

// Restoration is done across the whole work order, so it has no sites: the
// section is one entry that opens the restoration dialog.
const RestorationSection = ({ scheduleOfRates }: Props) => {
  const { setParam } = useHandleParams();

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

  const openDialog = () => setParam("dialog", "restoration");

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

      <button
        type='button'
        onClick={openDialog}
        className='group flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white p-3.5 text-left shadow-sm transition-all duration-200 hover:border-purple-300 hover:shadow-md focus-visible:border-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30'>
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
            <div className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
              Estimated
            </div>
            <div className='mt-0.5 text-[13px] font-semibold tabular-nums text-gray-800'>
              {formatCurrency(estimatedTotal)}
            </div>
          </div>
        )}
        <ArrowRight className='size-3.5 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-purple-600' />
      </button>

      <RestorationDialog
        rates={rates}
        estimatedTotal={estimatedTotal}
      />
    </section>
  );
};

export default RestorationSection;

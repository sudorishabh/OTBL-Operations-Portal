"use client";
import React from "react";
import { ArrowRight } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { formatDateRange } from "@/lib/wo-site-display";
import type { RestorationRate } from "./restoration-rates-table";
import type { Restoration } from "./restoration-section";

interface Props {
  workOrder: any;
  restoration: Restoration;
  rates: RestorationRate[];
  estimatedTotal: number;
  onOpen: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    amount,
  );

const fieldLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400";

// The work order's restoration at a glance; opens the restoration dialog.
const RestorationCard = ({
  workOrder,
  restoration,
  rates,
  estimatedTotal,
  onOpen,
}: Props) => {
  const contractorNames = restoration.contractors
    .map((contractor: { name: string }) => capitalFirstLetter(contractor.name))
    .join(", ");

  return (
    <button
      type='button'
      onClick={onOpen}
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
  );
};

export default RestorationCard;

"use client";
import React from "react";
import {
  CalendarDays,
  ChevronRight,
  FolderOpen,
  HardHat,
  RotateCcw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateRange, scheduleNote } from "@/lib/wo-site-display";
import WoSiteOperatorsSection from "../site-details-dialog/wo-site-operators-section";
import { PROCESS_TONES } from "../process-section-header";
import type { JobOrder } from "./job-order-dialog";
import type { Restoration } from "./restoration-section";
import { jobOrderVendorNames, restorationStatus } from "./restoration-display";

interface Props {
  workOrder: {
    start_date: string | Date | null;
    end_date: string | Date | null;
  };
  restoration: Restoration;
  operatorUploadsCount: number;
  onOpenOperatorUploads: () => void;
}

// Where the restoration stands, who its job orders give work to, and who can
// upload to it. Laid out like a site's information card.
const RestorationHeader = ({
  workOrder,
  restoration,
  operatorUploadsCount,
  onOpenOperatorUploads,
}: Props) => {
  const summaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery({
    work_order_site_id: restoration.id,
  });
  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery({
    work_order_site_id: restoration.id,
  });

  const status = restorationStatus(
    restoration,
    summaryQuery.data?.grandTotal ?? 0,
  );
  const vendorNames = jobOrderVendorNames(
    (jobOrdersQuery.data ?? []) as JobOrder[],
  );
  const note = restoration.is_completed
    ? null
    : scheduleNote(restoration.status, workOrder.start_date, workOrder.end_date);

  return (
    <section className='rounded-lg border border-gray-200 bg-white'>
      <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div
            className={cn(
              "shrink-0 rounded-lg p-2 ring-1",
              PROCESS_TONES.restoration.icon,
            )}>
            <RotateCcw className='size-4' />
          </div>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-sm font-semibold text-gray-900'>
                Restoration information
              </h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  status.style,
                )}>
                {status.label}
              </span>
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
              <span>Across the whole work order</span>
              <span
                className='inline-flex items-center gap-1.5 whitespace-nowrap'
                title='The work order schedule'>
                <CalendarDays className='size-3.5 text-gray-400' />
                {formatDateRange(workOrder.start_date, workOrder.end_date)}
              </span>
              {note && <span className={note.tone}>{note.text}</span>}
              <span
                className='inline-flex min-w-0 items-start gap-1.5'
                title='Vendors on its job orders'>
                <HardHat className='mt-px size-3.5 shrink-0 text-gray-400' />
                {vendorNames.length > 0 ? (
                  <span>{vendorNames.join(", ")}</span>
                ) : (
                  <span className='text-gray-400'>No vendors yet</span>
                )}
              </span>
            </div>
          </div>
        </div>
        {operatorUploadsCount > 0 && (
          <button
            type='button'
            onClick={onOpenOperatorUploads}
            title='View operator uploads'
            className='group inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30'>
            <FolderOpen className='size-3.5 text-gray-400' />
            {operatorUploadsCount} operator{" "}
            {operatorUploadsCount === 1 ? "upload" : "uploads"}
            <ChevronRight className='-mr-0.5 size-3.5 text-gray-400 transition-transform group-hover:translate-x-0.5' />
          </button>
        )}
      </div>

      <WoSiteOperatorsSection
        woSiteId={restoration.id}
        subject='restoration'
        variant='inline'
        className='border-t border-gray-100 px-5 py-4'
      />
    </section>
  );
};

export default RestorationHeader;

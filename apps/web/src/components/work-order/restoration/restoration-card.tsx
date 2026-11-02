"use client";
import React from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateRange, scheduleNote } from "@/lib/wo-site-display";
import type { RestorationRate } from "./restoration-rates-table";
import type { Restoration } from "./restoration-section";

interface Props {
  workOrder: any;
  restoration: Restoration;
  rates: RestorationRate[];
  estimatedTotal: number;
  onOpen: () => void;
}

// Allowance for decimal rounding when comparing quantities.
const QTY_EPSILON = 0.001;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, (part / whole) * 100) : 0;

const STATUS_STYLES = {
  complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inProgress: "bg-purple-50 text-purple-700 ring-purple-200",
  notStarted: "bg-gray-50 text-gray-600 ring-gray-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
} as const;

// How far one activity's schedule of rates quantity has been used.
const activityTone = (used: number, estimated: number) => {
  if (used > estimated + QTY_EPSILON) return { bar: "bg-rose-500", text: "text-rose-600" };
  if (used + QTY_EPSILON >= estimated) return { bar: "bg-emerald-500", text: "text-emerald-700" };
  if (used > 0) return { bar: "bg-purple-500", text: "text-gray-600" };
  return { bar: "bg-gray-200", text: "text-gray-400" };
};

// The work order's restoration at a glance: where it stands, what has been
// spent, and how far each activity has got, in the order the work is done.
// The whole card opens the restoration dialog.
const RestorationCard = ({
  workOrder,
  restoration,
  rates,
  estimatedTotal,
  onOpen,
}: Props) => {
  const summaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery({
    work_order_site_id: restoration.id,
  });
  const spent = summaryQuery.data?.grandTotal ?? 0;
  const usedByActivity = (summaryQuery.data?.byActivity ?? {}) as Record<
    string,
    { totalQuantity: number }
  >;

  const isCancelled = restoration.status === "cancelled";
  const status = isCancelled
    ? { label: "Cancelled", style: STATUS_STYLES.cancelled }
    : restoration.is_completed
      ? { label: "Complete", style: STATUS_STYLES.complete }
      : spent > 0
        ? { label: "In progress", style: STATUS_STYLES.inProgress }
        : { label: "Not started", style: STATUS_STYLES.notStarted };
  const note = restoration.is_completed
    ? null
    : scheduleNote(restoration.status, workOrder.start_date, workOrder.end_date);
  const isOverBudget = estimatedTotal > 0 && spent > estimatedTotal;

  return (
    <div className='group relative rounded-xl border border-gray-200 bg-white shadow-sm transition-colors duration-200 hover:border-purple-300 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-500/30'>
      <div className='flex flex-wrap items-start justify-between gap-x-8 gap-y-3 px-4 pb-3.5 pt-4'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-[15px] font-semibold tracking-tight text-gray-900'>
              {/* Stretched over the card, so the whole card opens the dialog. */}
              <button
                type='button'
                onClick={onOpen}
                className='text-left outline-none transition-colors after:absolute after:inset-0 after:rounded-xl group-hover:text-purple-700'>
                Restoration work
              </button>
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                status.style,
              )}>
              {status.label}
            </span>
          </div>
          <p className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500'>
            <span className='inline-flex items-center gap-1.5'>
              <CalendarDays className='size-3.5 text-gray-400' />
              {formatDateRange(workOrder.start_date, workOrder.end_date)}
            </span>
            {note && <span className={note.tone}>{note.text}</span>}
          </p>
        </div>

        <div className='flex items-center gap-3'>
          {estimatedTotal > 0 && (
            <div className='w-48 sm:text-right'>
              <p className='text-sm tabular-nums text-gray-500'>
                <span
                  className={cn(
                    "text-[15px] font-semibold",
                    isOverBudget ? "text-rose-600" : "text-gray-900",
                  )}>
                  {formatCurrency(spent)}
                </span>{" "}
                spent of {formatCurrency(estimatedTotal)}
              </p>
              <div className='mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100'>
                <div
                  className={cn(
                    "h-full rounded-full",
                    isOverBudget ? "bg-rose-500" : "bg-purple-500",
                  )}
                  style={{ width: `${percentOf(spent, estimatedTotal)}%` }}
                />
              </div>
            </div>
          )}
          <ChevronRight className='ml-auto size-4 shrink-0 text-gray-300 transition-colors group-hover:text-purple-600' />
        </div>
      </div>

      {/* The activities in the order the work is done, each with how much of
          its schedule of rates quantity expenses have used. */}
      {rates.length > 0 ? (
        // A row per activity on smaller screens, a column each on wide ones.
        <ol className='divide-y divide-gray-100 border-t border-gray-100 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:divide-x lg:divide-y-0'>
          {rates.map((rate, index) => {
            const estimated = Number(rate.estimated_quantity) || 0;
            const used = usedByActivity[rate.activity]?.totalQuantity ?? 0;
            const tone = activityTone(used, estimated);
            return (
              <li
                key={rate.activity}
                className='flex items-center gap-3 px-4 py-2.5 lg:block lg:py-3'>
                <p className='flex min-w-0 flex-1 gap-1.5 text-xs font-medium leading-4 text-gray-700 lg:min-h-8'>
                  <span className='tabular-nums text-gray-400'>{index + 1}</span>
                  <span className='line-clamp-2'>{rate.label}</span>
                </p>
                <div className='hidden h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-gray-100 sm:block lg:mt-2 lg:w-auto'>
                  <div
                    className={cn("h-full rounded-full", tone.bar)}
                    style={{ width: `${percentOf(used, estimated)}%` }}
                  />
                </div>
                <p
                  className={cn(
                    "shrink-0 text-right text-[11px] tabular-nums sm:w-32 lg:mt-1.5 lg:w-auto lg:text-left",
                    tone.text,
                  )}>
                  {formatQty(used)} of {formatQty(estimated)} {rate.unit}
                </p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className='border-t border-gray-100 px-4 py-3 text-xs text-gray-400'>
          The schedule of rates has no restoration activities.
        </p>
      )}
    </div>
  );
};

export default RestorationCard;

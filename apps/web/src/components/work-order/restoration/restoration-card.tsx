"use client";
import React from "react";
import Link from "next/link";
import {
  Award,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  HardHat,
  RotateCcw,
} from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { formatDateRange, scheduleNote } from "@/lib/wo-site-display";
import { toDocuments } from "@/lib/documents";
import type { JobOrder } from "./job-order-dialog";
import type { RestorationRate } from "./restoration-rates-table";
import type { Restoration } from "./restoration-section";
import { PROCESS_TONES } from "../process-section-header";

interface Props {
  workOrder: any;
  restoration: Restoration;
  rates: RestorationRate[];
  estimatedTotal: number;
  // The restoration page the panel opens.
  href: string;
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

// The work order's restoration section, as one panel: where it stands, what
// has been spent, and how far each activity has got, in the order the work is
// done. The whole panel opens the restoration page.
const RestorationCard = ({
  workOrder,
  restoration,
  rates,
  estimatedTotal,
  href,
}: Props) => {
  const summaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery({
    work_order_site_id: restoration.id,
  });
  const spent = summaryQuery.data?.grandTotal ?? 0;
  const usedByActivity = (summaryQuery.data?.byActivity ?? {}) as Record<
    string,
    { totalQuantity: number }
  >;

  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery({
    work_order_site_id: restoration.id,
  });
  const jobOrders = (jobOrdersQuery.data ?? []) as JobOrder[];
  const vendorNames = [
    ...new Map(
      jobOrders.flatMap((jobOrder) =>
        jobOrder.vendors.map((vendor) => [vendor.id, vendor.name] as const),
      ),
    ).values(),
  ].map((name) => capitalFirstLetter(name));
  const certifiedCount = jobOrders.filter(
    (jobOrder) => toDocuments(jobOrder.documents).length > 0,
  ).length;

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
    <section className='group relative rounded-lg border border-gray-200 bg-white transition-colors duration-200 hover:border-purple-300 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-500/30'>
      <div className='flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 pb-5 pt-6'>
        <div className='flex min-w-0 items-center gap-3'>
          <div
            className={cn(
              "shrink-0 rounded-lg p-2 ring-1",
              PROCESS_TONES.restoration.icon,
            )}>
            <RotateCcw className='size-4' />
          </div>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-base font-semibold text-gray-900'>
                {/* Stretched over the panel, so all of it opens the page. */}
                <Link
                  href={href}
                  className='outline-none transition-colors after:absolute after:inset-0 after:rounded-lg group-hover:text-purple-700'>
                  Restoration
                </Link>
              </h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  status.style,
                )}>
                {status.label}
              </span>
            </div>
            <p className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500'>
              <span>Across the whole work order</span>
              <span className='inline-flex items-center gap-1.5'>
                <CalendarDays className='size-3.5 text-gray-400' />
                {formatDateRange(workOrder.start_date, workOrder.end_date)}
              </span>
              {note && <span className={note.tone}>{note.text}</span>}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          {estimatedTotal > 0 && (
            <div className='w-56 sm:text-right'>
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
                className='flex items-center gap-3 px-6 py-3 lg:block lg:py-4'>
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
        <p className='border-t border-gray-100 px-6 py-3 text-xs text-gray-400'>
          The schedule of rates has no restoration activities.
        </p>
      )}

      {/* Who the work is given to, through job orders. */}
      <div className='flex flex-wrap items-center gap-x-5 gap-y-1 rounded-b-lg border-t border-gray-100 bg-gray-50/60 px-6 py-3 text-xs text-gray-600'>
        <span className='inline-flex items-center gap-1.5'>
          <ClipboardList className='size-3.5 text-gray-400' />
          {jobOrders.length === 0
            ? "No job orders yet"
            : `${jobOrders.length} job order${jobOrders.length !== 1 ? "s" : ""}`}
        </span>
        {vendorNames.length > 0 && (
          // Wraps rather than truncating: the card's click area covers any
          // tooltip.
          <span className='inline-flex min-w-0 items-start gap-1.5'>
            <HardHat className='mt-px size-3.5 shrink-0 text-gray-400' />
            <span>{vendorNames.join(", ")}</span>
          </span>
        )}
        {jobOrders.length > 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 sm:ml-auto",
              certifiedCount === jobOrders.length && "text-emerald-700",
            )}>
            <Award
              className={cn(
                "size-3.5",
                certifiedCount === jobOrders.length
                  ? "text-emerald-600"
                  : "text-gray-400",
              )}
            />
            {certifiedCount} of {jobOrders.length} certified complete
          </span>
        )}
      </div>
    </section>
  );
};

export default RestorationCard;

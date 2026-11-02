"use client";
import React from "react";
import { BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const formatName = (name: string) => {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

interface Props {
  woSiteId: number;
  className?: string;
}

// How much of each activity's schedule of rates is used across the work order.
// Renders nothing when none of the site's activities has a SOR quantity.
const SiteSorAvailability = ({ woSiteId, className }: Props) => {
  const siteActivitiesQuery =
    trpc.workOrderSiteQuery.getSiteActivities.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId },
    );

  const activities = (siteActivitiesQuery.data ?? []).filter(
    (a: any) => a.sor_estimated_quantity,
  );
  if (activities.length === 0) return null;

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
        <BarChart3 className='size-3.5 text-gray-400' />
        <span className='text-xs font-medium text-gray-700'>
          SOR availability
        </span>
        <span className='text-[11px] text-gray-400'>
          used across the work order
        </span>
      </div>

      <div
        className={cn(
          "divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white",
          activities.length > 5 && "max-h-40 overflow-y-auto",
        )}>
        {activities.map((activity: any) => {
          const sorQty = parseFloat(activity.sor_estimated_quantity || "0");
          const usedTotal = parseFloat(activity.total_used_quantity || "0");
          const available = sorQty - usedTotal;
          const unit = activity.unit || "Nos";
          const usedPct =
            sorQty > 0 ? Math.min(100, (usedTotal / sorQty) * 100) : 0;
          // Warns as the schedule of rates runs out.
          const barColor =
            usedPct >= 100
              ? "bg-rose-500"
              : usedPct >= 80
                ? "bg-amber-500"
                : "bg-emerald-500";

          return (
            <div
              key={activity.id}
              className='flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-xs'>
              <span className='min-w-0 flex-1 truncate font-medium text-gray-800'>
                {formatName(activity.activity)}
              </span>
              <span className='whitespace-nowrap tabular-nums text-gray-600'>
                <span className='text-gray-400'>SOR </span>
                {formatQty(sorQty)} <span className='text-gray-400'>{unit}</span>
              </span>
              <span className='whitespace-nowrap tabular-nums text-gray-600'>
                <span className='text-gray-400'>Used </span>
                {formatQty(usedTotal)}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap font-medium tabular-nums",
                  available < 0 ? "text-rose-600" : "text-gray-900",
                )}>
                <span className='font-normal text-gray-400'>Left </span>
                {formatQty(available)}
              </span>
              <div className='flex w-28 items-center gap-1.5'>
                <div className='h-1 flex-1 overflow-hidden rounded-full bg-gray-100'>
                  <div
                    className={cn("h-full rounded-full", barColor)}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <span className='w-8 shrink-0 text-right text-[11px] tabular-nums text-gray-500'>
                  {usedPct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SiteSorAvailability;

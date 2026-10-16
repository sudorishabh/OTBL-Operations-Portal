"use client";
import React from "react";
import { BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

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
    <div className={cn("space-y-2", className)}>
      <div className='flex items-center gap-2'>
        <BarChart3 className='w-3.5 h-3.5 text-emerald-500' />
        <span className='text-xs font-medium text-gray-700'>
          SOR Availability
        </span>
        <span className='text-[10px] text-gray-400 truncate'>
          (used across the work order)
        </span>
      </div>

      <div
        className={cn(
          "rounded-lg border bg-white divide-y divide-slate-100",
          activities.length > 5 ? "max-h-40 overflow-y-auto" : undefined,
        )}>
        {activities.map((activity: any) => {
          const sorQty = parseFloat(activity.sor_estimated_quantity || "0");
          const usedTotal = parseFloat(activity.total_used_quantity || "0");
          const available = sorQty - usedTotal;
          const usedPct =
            sorQty > 0 ? Math.min(100, (usedTotal / sorQty) * 100) : 0;
          const barColor =
            usedPct >= 100
              ? "bg-red-500"
              : usedPct >= 80
                ? "bg-amber-500"
                : "bg-emerald-500";

          return (
            <div
              key={activity.id}
              className='flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-[11px]'>
              <span className='min-w-0 flex-1 truncate font-medium text-slate-700'>
                {formatName(activity.activity)}
              </span>
              <span className='whitespace-nowrap tabular-nums text-slate-600'>
                <span className='text-slate-400'>SOR </span>
                {sorQty.toFixed(2)}{" "}
                <span className='text-slate-400'>
                  {activity.unit || "Nos"}
                </span>
              </span>
              <span className='whitespace-nowrap tabular-nums text-amber-700'>
                <span className='text-slate-400'>Used </span>
                {usedTotal.toFixed(2)}
              </span>
              <span
                className={`whitespace-nowrap tabular-nums font-semibold ${
                  available < 0 ? "text-red-600" : "text-emerald-700"
                }`}>
                <span className='font-normal text-slate-400'>Avail. </span>
                {available.toFixed(2)}
              </span>
              <div className='flex w-28 items-center gap-1.5'>
                <div className='h-1 flex-1 bg-slate-100 rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(100, usedPct)}%` }}
                  />
                </div>
                <span className='text-[10px] tabular-nums text-slate-500 w-8 text-right shrink-0'>
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

"use client";
import React from "react";
import { BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className={cn("space-y-3", className)}>
      <div className='flex items-center gap-2'>
        <BarChart3 className='w-3.5 h-3.5 text-emerald-500' />
        <span className='text-xs font-medium text-gray-700'>
          SOR Availability
        </span>
        <span className='text-[10px] text-gray-400 truncate'>
          (used across the work order)
        </span>
      </div>

      <div className='rounded-lg border bg-white overflow-hidden'>
        <div
          className={cn(
            "overflow-x-auto",
            activities.length > 5 ? "max-h-40 overflow-y-auto" : undefined,
          )}>
          <Table className='w-full text-[11px]'>
            <TableHeader>
              <TableRow className='border-slate-100 hover:bg-transparent'>
                <TableHead className='h-8 px-2 py-0 text-left font-semibold text-slate-500 uppercase tracking-wide'>
                  Activity
                </TableHead>
                <TableHead className='h-8 px-2 py-0 text-right font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap'>
                  SOR
                </TableHead>
                <TableHead className='h-8 px-2 py-0 text-right font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap'>
                  Used
                </TableHead>
                <TableHead className='h-8 px-2 py-0 text-right font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap'>
                  Avail.
                </TableHead>
                <TableHead className='h-8 px-2 py-0 text-left font-semibold text-slate-500 uppercase tracking-wide w-[88px]'>
                  %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className='[&_tr]:border-slate-100'>
              {activities.map((activity: any) => {
                const sorQty = parseFloat(
                  activity.sor_estimated_quantity || "0",
                );
                const usedTotal = parseFloat(
                  activity.total_used_quantity || "0",
                );
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
                  <TableRow
                    key={activity.id}
                    className='hover:bg-slate-50/50'>
                    <TableCell className='px-2 py-1.5 max-w-[140px] truncate font-medium text-slate-700'>
                      {formatName(activity.activity)}
                    </TableCell>
                    <TableCell className='px-2 py-1.5 text-right tabular-nums text-slate-600 whitespace-nowrap'>
                      {sorQty.toFixed(2)}{" "}
                      <span className='text-slate-400 font-normal'>
                        {activity.unit || "Nos"}
                      </span>
                    </TableCell>
                    <TableCell className='px-2 py-1.5 text-right tabular-nums text-amber-700'>
                      {usedTotal.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`px-2 py-1.5 text-right tabular-nums font-semibold ${
                        available < 0 ? "text-red-600" : "text-emerald-700"
                      }`}>
                      {available.toFixed(2)}
                    </TableCell>
                    <TableCell className='px-2 py-1.5'>
                      <div className='flex items-center gap-1.5 min-w-0'>
                        <div className='h-1 flex-1 min-w-[36px] bg-slate-100 rounded-full overflow-hidden'>
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{
                              width: `${Math.min(100, usedPct)}%`,
                            }}
                          />
                        </div>
                        <span className='text-[10px] tabular-nums text-slate-500 w-8 text-right shrink-0'>
                          {usedPct.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default SiteSorAvailability;

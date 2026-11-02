"use client";
import React from "react";
import { CheckCircle2, Target } from "lucide-react";
import { constants } from "@pkg/utils";
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

const { TPH_TARGET, WO_UNITS, ZERO_DAY_SAMPLE } = constants;

interface Props {
  woSiteId: number;
  isCompleted: boolean;
  className?: string;
}

const formatQty = (value: number) =>
  `${Number(value.toFixed(2)).toLocaleString("en-IN")} ${WO_UNITS.MT}`;

const sampleDate = (sample: any) =>
  new Date(sample.sampled_on ?? sample.created_at).getTime();

const headClass =
  "text-[10px] font-semibold text-gray-600 whitespace-nowrap text-right";
const cellClass =
  "py-2 text-xs text-gray-700 text-right tabular-nums whitespace-nowrap";

// The site's share of the schedule of rates. It is used in full once
// treatment is achieved: the latest bio sample's TPH is below the target.
const SiteSorCompletion = ({ woSiteId, isCompleted, className }: Props) => {
  const stockQuery = trpc.workOrderSiteQuery.getOilZapperStock.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );
  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId },
    );

  const sorQuantity = stockQuery.data?.sorQuantity ?? null;
  const latestSample = (bioremediationDataQuery.data?.bioSamples ?? [])
    .filter((sample: any) => sample.application_month !== ZERO_DAY_SAMPLE)
    .sort((a: any, b: any) => sampleDate(b) - sampleDate(a))[0];

  const used = isCompleted && sorQuantity !== null ? sorQuantity : 0;
  const available = sorQuantity !== null ? sorQuantity - used : null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Target className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            SOR Completion
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            isCompleted
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-500",
          )}>
          {isCompleted && <CheckCircle2 className='size-3' />}
          Latest TPH:{" "}
          {latestSample ? latestSample.tph_value : "no sample yet"} · target
          below {TPH_TARGET}
        </span>
      </div>

      {sorQuantity === null ? (
        <p className='rounded-lg border border-dashed bg-white px-3 py-4 text-center text-xs text-gray-400'>
          Save the site's estimate to allocate its share of the schedule of
          rates.
        </p>
      ) : (
        <div className='overflow-hidden rounded-lg border border-slate-200 bg-white'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50/60 hover:bg-gray-50/60'>
                <TableHead className={headClass}>SOR Qty (Site)</TableHead>
                <TableHead className={headClass}>Used</TableHead>
                <TableHead className={headClass}>Available</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className='hover:bg-transparent'>
                <TableCell className={cellClass}>
                  {formatQty(sorQuantity)}
                </TableCell>
                <TableCell className={cellClass}>{formatQty(used)}</TableCell>
                <TableCell
                  className={cn(
                    cellClass,
                    "font-semibold",
                    available ? "text-amber-700" : "text-emerald-700",
                  )}>
                  {formatQty(available ?? 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default SiteSorCompletion;

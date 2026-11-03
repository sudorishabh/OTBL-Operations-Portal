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
  "h-8 px-3 sm:h-8 sm:px-3 text-[11px] font-medium text-gray-400 whitespace-nowrap text-right";
const cellClass =
  "px-3 py-2 sm:px-3 sm:py-2 text-[13px] text-gray-700 text-right tabular-nums whitespace-nowrap";

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
        <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5'>
          <Target className='size-3.5 text-gray-400' />
          <span className='text-xs font-medium text-gray-700'>
            SOR completion
          </span>
          <span className='text-[11px] text-gray-400'>
            used in full once the TPH is below {TPH_TARGET}
          </span>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
            isCompleted
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-gray-50 text-gray-600 ring-gray-200",
          )}>
          {isCompleted && <CheckCircle2 className='size-3' />}
          {latestSample
            ? `Latest TPH ${latestSample.tph_value}`
            : "No monthly sample yet"}
        </span>
      </div>

      {sorQuantity === null ? (
        <p className='rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-400'>
          Save the site's estimate to allocate its share of the schedule of
          rates.
        </p>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
          <Table>
            <TableHeader>
              <TableRow className='border-gray-100 hover:bg-transparent'>
                <TableHead className={headClass}>Site&apos;s SOR</TableHead>
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
                    "font-medium",
                    available ? "text-gray-900" : "text-emerald-700",
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

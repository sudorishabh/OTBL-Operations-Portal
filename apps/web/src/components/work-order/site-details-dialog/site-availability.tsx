"use client";
import React from "react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const { OIL_ZAPPER, WO_PROCESS } = constants;

interface Props {
  woSiteId: number;
  processType: string;
  className?: string;
}

interface SorActivity {
  id: number;
  activity: string;
  unit: string | null;
  sor_estimated_quantity: string | null;
  total_used_quantity: string | null;
}

interface OilZapperStock {
  estimated: number | null;
  procured: number;
  used: number;
  left: number;
}

const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const formatName = (name: string) =>
  name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, (part / whole) * 100) : 0;

// Warns as something runs out.
const barTone = (usedPct: number) =>
  usedPct >= 100 ? "bg-rose-500" : usedPct >= 80 ? "bg-amber-500" : "bg-emerald-500";

const Panel = ({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) => (
  <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
    <p className='flex flex-wrap items-baseline gap-x-2 border-b border-gray-100 px-3 py-2'>
      <span className='text-xs font-medium text-gray-700'>{title}</span>
      <span className='text-[11px] text-gray-400'>{note}</span>
    </p>
    {children}
  </div>
);

// Each activity's schedule of rates across the work order: used and left.
const SorPanel = ({ activities }: { activities: SorActivity[] }) => (
  <Panel
    title='Schedule of rates'
    note='used across the work order'>
    <ul
      className={cn(
        "divide-y divide-gray-100",
        activities.length > 5 && "max-h-48 overflow-y-auto",
      )}>
      {activities.map((activity) => {
        const sorQty = parseFloat(activity.sor_estimated_quantity || "0");
        const used = parseFloat(activity.total_used_quantity || "0");
        const left = sorQty - used;
        const usedPct = percentOf(used, sorQty);

        return (
          <li
            key={activity.id}
            className='flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-2 text-xs'>
            <span className='min-w-0 flex-1 truncate font-medium text-gray-800'>
              {formatName(activity.activity)}
            </span>
            <span className='whitespace-nowrap tabular-nums text-gray-600'>
              <span className='text-gray-400'>SOR </span>
              {formatQty(sorQty)}{" "}
              <span className='text-gray-400'>{activity.unit || "Nos"}</span>
            </span>
            <span className='whitespace-nowrap tabular-nums text-gray-600'>
              <span className='text-gray-400'>Used </span>
              {formatQty(used)}
            </span>
            <span
              className={cn(
                "whitespace-nowrap font-medium tabular-nums",
                left < 0 ? "text-rose-600" : "text-gray-900",
              )}>
              <span className='font-normal text-gray-400'>Left </span>
              {formatQty(left)}
            </span>
            <div className='flex w-24 items-center gap-1.5'>
              <div className='h-1 flex-1 overflow-hidden rounded-full bg-gray-100'>
                <div
                  className={cn("h-full rounded-full", barTone(usedPct))}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <span className='w-8 shrink-0 text-right text-[11px] tabular-nums text-gray-500'>
                {usedPct.toFixed(0)}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  </Panel>
);

// The site's oil zapper: planned by its estimate, procured through its
// expenses, used by its oil zapping, and what is left to apply.
const StockPanel = ({ stock }: { stock: OilZapperStock & { estimated: number } }) => {
  const unit = OIL_ZAPPER.UNIT;
  const isOverProcured = stock.procured > stock.estimated;
  const usedPct = percentOf(stock.used, stock.procured);
  const figures = [
    { label: "Estimated", value: stock.estimated },
    {
      label: "Procured",
      value: stock.procured,
      tone: isOverProcured ? "text-orange-700" : undefined,
      title: isOverProcured
        ? `More ${OIL_ZAPPER.LABEL.toLowerCase()} procured than estimated`
        : undefined,
    },
    { label: "Used", value: stock.used },
    {
      label: "Left",
      value: stock.left,
      tone: stock.left > 0 ? "text-emerald-700" : "text-rose-600",
    },
  ];

  return (
    <Panel
      title={`${OIL_ZAPPER.LABEL} stock`}
      note='procured from expenses, used by oil zapping'>
      <dl className='grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-2.5 sm:grid-cols-4'>
        {figures.map((figure) => (
          <div
            key={figure.label}
            title={figure.title}>
            <dt className='text-[11px] text-gray-400'>{figure.label}</dt>
            <dd
              className={cn(
                "text-sm font-semibold tabular-nums text-gray-900",
                figure.tone,
              )}>
              {formatQty(figure.value)}{" "}
              <span className='text-xs font-normal text-gray-400'>{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className='flex items-center gap-2 border-t border-gray-100 px-3 py-2'>
        <div className='h-1 flex-1 overflow-hidden rounded-full bg-gray-100'>
          <div
            className={cn("h-full rounded-full", barTone(usedPct))}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <span className='shrink-0 text-[11px] tabular-nums text-gray-500'>
          {formatQty(stock.used)} of {formatQty(stock.procured)} {unit} used
        </span>
      </div>
    </Panel>
  );
};

// What the site can still draw on: the work order's schedule of rates for
// its activities and, at a bioremediation site, its oil zapper. Hidden until
// there is either to show.
const SiteAvailability = ({ woSiteId, processType, className }: Props) => {
  const isBioremediation = processType === WO_PROCESS.BIOREMEDIATION;

  const activitiesQuery = trpc.workOrderSiteQuery.getSiteActivities.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );
  const stockQuery = trpc.workOrderSiteQuery.getOilZapperStock.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId && isBioremediation },
  );

  const sorActivities = ((activitiesQuery.data ?? []) as SorActivity[]).filter(
    (activity) => activity.sor_estimated_quantity,
  );
  const stockData = stockQuery.data as OilZapperStock | undefined;
  // The stock starts once the estimate plans the site's oil zapper.
  const stock =
    isBioremediation && stockData && stockData.estimated !== null
      ? { ...stockData, estimated: stockData.estimated }
      : null;

  if (sorActivities.length === 0 && !stock) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h3 className='text-sm font-semibold text-gray-900'>Availability</h3>
        <p className='text-xs text-gray-500'>
          What is left of the schedule of rates
          {stock ? ` and the site's ${OIL_ZAPPER.LABEL.toLowerCase()}` : ""}.
        </p>
      </div>
      {/* One above the other. */}
      <div className='space-y-3'>
        {sorActivities.length > 0 && <SorPanel activities={sorActivities} />}
        {stock && <StockPanel stock={stock} />}
      </div>
    </section>
  );
};

export default SiteAvailability;

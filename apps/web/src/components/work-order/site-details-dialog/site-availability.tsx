"use client";
import React from "react";
import { CheckCircle2 } from "lucide-react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const { OIL_ZAPPER, TPH_TARGET, WO_PROCESS, WO_UNITS, ZERO_DAY_SAMPLE } =
  constants;

interface Props {
  woSiteId: number;
  processType: string;
  // A bioremediation site completes once its TPH drops below the target.
  isCompleted: boolean;
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
  // The site's share of the schedule of rates, set by its estimate.
  sorQuantity: number | null;
}

interface Figure {
  label: string;
  value: number;
  tone?: string;
  title?: string;
}

const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

const formatName = (name: string) =>
  name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const sampleDate = (sample: any) =>
  new Date(sample.sampled_on ?? sample.created_at).getTime();

const percentOf = (part: number, whole: number) =>
  whole > 0 ? Math.min(100, (part / whole) * 100) : 0;

// Warns as something runs out.
const barTone = (usedPct: number) =>
  usedPct >= 100 ? "bg-rose-500" : usedPct >= 80 ? "bg-amber-500" : "bg-emerald-500";

const Panel = ({
  title,
  note,
  aside,
  children,
}: {
  title: string;
  note: string;
  // Shown at the right of the title, such as a status.
  aside?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
    <div className='flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2'>
      <p className='flex min-w-0 flex-wrap items-baseline gap-x-2'>
        <span className='text-xs font-medium text-gray-700'>{title}</span>
        <span className='text-[11px] text-gray-400'>{note}</span>
      </p>
      {aside}
    </div>
    {children}
  </div>
);

// A panel's quantities side by side, on the same four columns in every panel
// so the stacked panels line up.
const Figures = ({ figures, unit }: { figures: Figure[]; unit: string }) => (
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
  const figures: Figure[] = [
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
      <Figures
        figures={figures}
        unit={unit}
      />
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

// The site's share of the schedule of rates. It is used in full once
// treatment is achieved: the latest bio sample's TPH is below the target.
const SorCompletionPanel = ({
  woSiteId,
  sorQuantity,
  isCompleted,
}: {
  woSiteId: number;
  sorQuantity: number | null;
  isCompleted: boolean;
}) => {
  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId },
    );
  const latestSample = (bioremediationDataQuery.data?.bioSamples ?? [])
    .filter((sample: any) => sample.application_month !== ZERO_DAY_SAMPLE)
    .sort((a: any, b: any) => sampleDate(b) - sampleDate(a))[0];

  const used = isCompleted && sorQuantity !== null ? sorQuantity : 0;
  const available = sorQuantity !== null ? sorQuantity - used : 0;

  return (
    <Panel
      title='SOR completion'
      note={`this site's share, used in full once the TPH is below ${TPH_TARGET}`}
      aside={
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
      }>
      {sorQuantity === null ? (
        <p className='px-3 py-2.5 text-xs text-gray-400'>
          Save the site&apos;s estimate to allocate its share of the schedule of
          rates.
        </p>
      ) : (
        <Figures
          unit={WO_UNITS.MT}
          figures={[
            { label: "Site's SOR", value: sorQuantity },
            { label: "Used", value: used },
            {
              label: "Available",
              value: available,
              tone: available > 0 ? undefined : "text-emerald-700",
            },
          ]}
        />
      )}
    </Panel>
  );
};

// What the site can still draw on: the work order's schedule of rates for
// its activities and, at a bioremediation site, its share of it and its oil
// zapper. Hidden until there is something to show.
const SiteAvailability = ({
  woSiteId,
  processType,
  isCompleted,
  className,
}: Props) => {
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

  // Every bioremediation site has a share once its stock is loaded, even if
  // its estimate hasn't set it yet.
  const hasSorShare = isBioremediation && !!stockData;

  if (sorActivities.length === 0 && !hasSorShare) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h3 className='text-sm font-semibold text-gray-900'>Availability</h3>
        <p className='text-xs text-gray-500'>
          What is left for this site to draw on.
        </p>
      </div>
      {/* One above the other. */}
      <div className='space-y-3'>
        {sorActivities.length > 0 && <SorPanel activities={sorActivities} />}
        {hasSorShare && (
          <SorCompletionPanel
            woSiteId={woSiteId}
            sorQuantity={stockData.sorQuantity}
            isCompleted={isCompleted}
          />
        )}
        {stock && <StockPanel stock={stock} />}
      </div>
    </section>
  );
};

export default SiteAvailability;

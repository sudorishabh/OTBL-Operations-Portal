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

// A compact card: its title and note, a status at the right, then its
// figures. Its last child sits at the bottom, so cards side by side line up.
const Card = ({
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
  <div className='@container flex min-w-0 flex-col gap-2.5 rounded-lg border border-gray-200 bg-white p-3 [&>*:last-child]:mt-auto'>
    <div className='flex items-start justify-between gap-2'>
      <div className='min-w-0'>
        <p className='text-xs font-semibold text-gray-800'>{title}</p>
        <p
          className='truncate text-[11px] text-gray-400'
          title={note}>
          {note}
        </p>
      </div>
      {aside}
    </div>
    {children}
  </div>
);

// A card's quantities side by side, four abreast once the card is wide enough.
const Figures = ({ figures, unit }: { figures: Figure[]; unit: string }) => (
  <dl
    className={cn(
      "grid gap-x-3 gap-y-1.5",
      figures.length > 3 ? "grid-cols-2 @sm:grid-cols-4" : "grid-cols-3",
    )}>
    {figures.map((figure) => (
      <div
        key={figure.label}
        title={figure.title}
        className='min-w-0'>
        <dt className='text-[11px] text-gray-400'>{figure.label}</dt>
        <dd
          className={cn(
            "truncate text-[13px] font-semibold tabular-nums text-gray-900",
            figure.tone,
          )}>
          {formatQty(figure.value)}{" "}
          <span className='text-[11px] font-normal text-gray-400'>{unit}</span>
        </dd>
      </div>
    ))}
  </dl>
);

// How much of something is used, as a bar with its figures beside it. The
// bar warns as it runs out, unless given its own colour.
const UsageBar = ({
  used,
  total,
  caption,
  barClassName,
}: {
  used: number;
  total: number;
  caption: string;
  barClassName?: string;
}) => {
  const usedPct = percentOf(used, total);
  return (
    <div className='flex items-center gap-2'>
      <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100'>
        <div
          className={cn("h-full rounded-full", barClassName ?? barTone(usedPct))}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <span className='shrink-0 text-[11px] tabular-nums text-gray-500'>
        {caption}
      </span>
    </div>
  );
};

// Each activity's schedule of rates across the work order: what is left,
// over a bar of what is used.
const SorCard = ({ activities }: { activities: SorActivity[] }) => (
  <Card
    title='Schedule of rates'
    note='Used across the work order'>
    <ul
      className={cn(
        "space-y-2.5",
        activities.length > 3 && "max-h-40 overflow-y-auto pr-1",
      )}>
      {activities.map((activity) => {
        const sorQty = parseFloat(activity.sor_estimated_quantity || "0");
        const used = parseFloat(activity.total_used_quantity || "0");
        const left = sorQty - used;
        const unit = activity.unit || "Nos";

        return (
          <li
            key={activity.id}
            className='space-y-1'>
            <div className='flex items-baseline justify-between gap-2 text-xs'>
              <span className='min-w-0 truncate font-medium text-gray-800'>
                {formatName(activity.activity)}
              </span>
              <span className='shrink-0 tabular-nums text-gray-500'>
                <span
                  className={cn(
                    "text-[13px] font-semibold",
                    left < 0 ? "text-rose-600" : "text-gray-900",
                  )}>
                  {formatQty(left)}
                </span>{" "}
                {unit} left
              </span>
            </div>
            <UsageBar
              used={used}
              total={sorQty}
              caption={`${formatQty(used)} of ${formatQty(sorQty)} used`}
            />
          </li>
        );
      })}
    </ul>
  </Card>
);

// The site's oil zapper: planned by its estimate, procured through its
// expenses, used by its oil zapping, and what is left to apply.
const StockCard = ({ stock }: { stock: OilZapperStock & { estimated: number } }) => {
  const unit = OIL_ZAPPER.UNIT;
  const isOverProcured = stock.procured > stock.estimated;
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
    <Card
      title={`${OIL_ZAPPER.LABEL} stock`}
      note='Procured from expenses, used by oil zapping'>
      <Figures
        figures={figures}
        unit={unit}
      />
      <UsageBar
        used={stock.used}
        total={stock.procured}
        caption={`${formatQty(stock.used)} of ${formatQty(stock.procured)} ${unit} used`}
      />
    </Card>
  );
};

// The site's share of the schedule of rates. It is used in full once
// treatment is achieved: the latest bio sample's TPH is below the target.
const SorCompletionCard = ({
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
    <Card
      title='SOR completion'
      note={`This site's share, used in full once the TPH is below ${TPH_TARGET}`}
      aside={
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
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
        <p className='text-xs text-gray-400'>
          Save the site&apos;s estimate to allocate its share of the schedule of
          rates.
        </p>
      ) : (
        <>
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
          {/* Using it all is the aim here, not running out. */}
          <UsageBar
            used={used}
            total={sorQuantity}
            barClassName='bg-emerald-500'
            caption={
              isCompleted
                ? "Used in full"
                : `Used in full once the TPH is below ${TPH_TARGET}`
            }
          />
        </>
      )}
    </Card>
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

  const cardCount =
    (sorActivities.length > 0 ? 1 : 0) + (hasSorShare ? 1 : 0) + (stock ? 1 : 0);

  return (
    <section className={cn("space-y-3", className)}>
      <div className='flex flex-wrap items-baseline gap-x-2'>
        <h3 className='text-sm font-semibold text-gray-900'>Availability</h3>
        <p className='text-xs text-gray-500'>
          What is left for this site to draw on.
        </p>
      </div>
      {/* Side by side, as many abreast as there are cards and room. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-3 md:grid-cols-2",
          cardCount >= 3 && "xl:grid-cols-3",
        )}>
        {sorActivities.length > 0 && <SorCard activities={sorActivities} />}
        {hasSorShare && (
          <SorCompletionCard
            woSiteId={woSiteId}
            sorQuantity={stockData.sorQuantity}
            isCompleted={isCompleted}
          />
        )}
        {stock && <StockCard stock={stock} />}
      </div>
    </section>
  );
};

export default SiteAvailability;

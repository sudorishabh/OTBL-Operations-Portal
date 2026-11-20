"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@pkg/utils";
import { cn } from "@/lib/utils";
import { ALL } from "@/components/filters/list-filters";
import {
  SOURCES,
  SPEND_COLOR,
  SPEND_FADED_COLOR,
  formatCompactAmount,
  inPickedMonths,
  monthLabel,
  monthsBetween,
  type ExpenseSource,
  type VendorExpenseBreakdown,
  type VendorExpenseFilters,
} from "./vendor-expense-filters";

// What a vendor's expenses come to, as the filters narrow them: the headline
// figures, spend by month, the split by kind of order, and the work orders
// most was spent in. Every part picks a filter when clicked.

const Card = ({
  title,
  aside,
  children,
  className,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-xl border border-gray-200 bg-white p-4 shadow-xs",
      className,
    )}>
    <div className='mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
      <h4 className='text-sm font-semibold text-gray-800'>{title}</h4>
      {aside}
    </div>
    {children}
  </div>
);

const Tile = ({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) => (
  <div className='px-4 py-3'>
    <p className='text-xs text-gray-500'>{label}</p>
    <p className='mt-0.5 text-lg font-semibold text-gray-900'>{value}</p>
    {note && <p className='mt-0.5 text-xs text-gray-500'>{note}</p>}
  </div>
);

// A share in whole percents; a sliver of one reads as under 1%.
const shareOf = (part: number, whole: number) => {
  if (!(whole > 0) || part <= 0) return "0%";
  const percent = Math.round((part / whole) * 100);
  return percent === 0 ? "<1%" : `${percent}%`;
};

// The smallest clean value at or above the given one: 1, 2, 2.5 or 5 times a
// power of ten, so the axis reads in round figures.
const niceCeil = (value: number) => {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
};

const PLOT_HEIGHT = 140;
// Each month's column is at least this wide, wider when few months fill the
// card; its bar is narrower, the rest is air. Past the card's width the
// months scroll.
const MIN_SLOT_WIDTH = 28;
const slotStyle = { minWidth: MIN_SLOT_WIDTH, flex: "1 1 0" };

// Spend in each month from the first to the last with expenses, empty months
// included, so the time between reads true. Months outside a picked range
// are faded rather than dropped. Clicking a month shows only it; with shift,
// the range from the month picked to it.
const MonthChart = ({
  months,
  filters,
  onPickMonths,
}: {
  months: VendorExpenseBreakdown["months"];
  filters: VendorExpenseFilters;
  onPickMonths: (from: string, to: string) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const byMonth = new Map(months.map((row) => [row.month, row]));
  const oldestFirst = [...byMonth.keys()].sort();
  const timeline =
    oldestFirst.length > 0
      ? monthsBetween(oldestFirst[0]!, oldestFirst.at(-1)!)
      : [];
  const top = niceCeil(Math.max(0, ...months.map((row) => row.total)));
  const ticks = [0, top / 2, top];
  const peak = months.reduce<(typeof months)[number] | null>(
    (best, row) => (!best || row.total > best.total ? row : best),
    null,
  );
  const isRangePicked = filters.from !== ALL || filters.to !== ALL;
  const readout = hovered ? byMonth.get(hovered) : undefined;

  // The newest months are the ones usually wanted: start scrolled to them.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [timeline.length]);

  const pick = (month: string, extend: boolean) => {
    const single = filters.from !== ALL && filters.from === filters.to;
    if (single && filters.from === month) {
      onPickMonths(ALL, ALL);
    } else if (extend && filters.from !== ALL) {
      const ends = [filters.from, month].sort();
      onPickMonths(ends[0]!, ends[1]!);
    } else {
      onPickMonths(month, month);
    }
  };

  return (
    <Card
      title='Spent by month'
      aside={
        <p
          aria-live='polite'
          className='text-xs text-gray-500'>
          {hovered && readout ? (
            <>
              {monthLabel(hovered)}:{" "}
              <span className='font-semibold text-gray-900'>
                {formatCurrency(readout.total)}
              </span>{" "}
              across {readout.count}{" "}
              {readout.count === 1 ? "expense" : "expenses"}
            </>
          ) : (
            "Click a month to see only it; shift-click to pick a range"
          )}
        </p>
      }>
      {timeline.length === 0 ? (
        <p className='py-10 text-center text-xs text-gray-400'>
          No expenses to chart.
        </p>
      ) : (
        <div className='flex'>
          {/* The value axis stays put while the months scroll. */}
          <div
            className='relative w-14 shrink-0'
            style={{ height: PLOT_HEIGHT, marginTop: 16 }}>
            {ticks.map((tick) => (
              <span
                key={tick}
                className='absolute right-2 translate-y-1/2 text-[10px] tabular-nums text-gray-400'
                style={{ bottom: `${(tick / top) * 100}%` }}>
                {tick === 0 ? "₹0" : formatCompactAmount(tick)}
              </span>
            ))}
          </div>
          <div
            ref={scrollRef}
            className='min-w-0 flex-1 overflow-x-auto pb-1'>
            <div
              className='relative pt-4'
              style={{ minWidth: timeline.length * MIN_SLOT_WIDTH }}>
              <div
                className='relative'
                style={{ height: PLOT_HEIGHT }}>
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 border-t",
                      tick === 0 ? "border-gray-300" : "border-gray-100",
                    )}
                    style={{ bottom: `${(tick / top) * 100}%` }}
                  />
                ))}
                <div className='absolute inset-0 flex items-end'>
                  {timeline.map((month) => {
                    const row = byMonth.get(month);
                    if (!row) {
                      return (
                        <div
                          key={month}
                          aria-hidden
                          className='h-full'
                          style={slotStyle}
                        />
                      );
                    }
                    const isPicked =
                      !isRangePicked || inPickedMonths(month, filters);
                    const isHovered = hovered === month;
                    const height = Math.max(2, (row.total / top) * PLOT_HEIGHT);
                    return (
                      <button
                        key={month}
                        type='button'
                        aria-label={`${monthLabel(month)}: ${formatCurrency(row.total)} across ${row.count} ${row.count === 1 ? "expense" : "expenses"}. Show only this month.`}
                        aria-pressed={isRangePicked && isPicked}
                        onClick={(event) => pick(month, event.shiftKey)}
                        onPointerEnter={() => setHovered(month)}
                        onPointerLeave={() => setHovered(null)}
                        onFocus={() => setHovered(month)}
                        onBlur={() => setHovered(null)}
                        className='relative flex h-full cursor-pointer items-end justify-center rounded-sm outline-none focus-visible:bg-blue-50'
                        style={slotStyle}>
                        {/* Only the highest month carries its figure. */}
                        {row === peak && (
                          <span
                            className='absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-gray-600'
                            style={{ bottom: height + 3 }}>
                            {formatCompactAmount(row.total)}
                          </span>
                        )}
                        <span
                          className='block w-5 rounded-t-[4px] transition-[filter]'
                          style={{
                            height,
                            backgroundColor: isPicked
                              ? SPEND_COLOR
                              : SPEND_FADED_COLOR,
                            filter: isHovered ? "brightness(0.85)" : undefined,
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Each month's name; the year under January and the first. */}
              <div className='mt-1 flex'>
                {timeline.map((month, index) => (
                  <span
                    key={month}
                    className='text-center text-[10px] leading-tight text-gray-400'
                    style={slotStyle}>
                    {monthLabel(month, "MMM")}
                    {(index === 0 || month.endsWith("-01")) && (
                      <span className='block text-gray-500'>
                        {month.slice(0, 4)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

// The whole split by kind of order: a thin bar, then each kind with its
// figures. Clicking a kind shows only its expenses, and again shows all.
const SourceSplit = ({
  sources,
  offered,
  total,
  picked,
  onPick,
}: {
  sources: VendorExpenseBreakdown["sources"];
  offered: ExpenseSource[];
  total: number;
  picked: string;
  onPick: (source: string) => void;
}) => {
  const rows = SOURCES.filter((source) => offered.includes(source.value)).map(
    (source) => ({
      ...source,
      ...(sources.find((row) => row.source === source.value) ?? {
        total: 0,
        count: 0,
      }),
    }),
  );

  return (
    <Card title='By order type'>
      <div
        role='img'
        aria-label={rows
          .map((row) => `${row.label} ${shareOf(row.total, total)}`)
          .join(", ")}
        className='flex h-2 gap-0.5 overflow-hidden rounded-full bg-gray-100'>
        {rows
          .filter((row) => row.total > 0)
          .map((row) => (
            <span
              key={row.value}
              className='h-full'
              style={{
                flexGrow: row.total,
                flexBasis: 0,
                backgroundColor: row.color,
              }}
            />
          ))}
      </div>
      <ul className='mt-3 space-y-0.5'>
        {rows.map((row) => {
          const isPicked = picked === row.value;
          return (
            <li key={row.value}>
              <button
                type='button'
                aria-pressed={isPicked}
                onClick={() => onPick(isPicked ? ALL : row.value)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  isPicked ? "bg-gray-100" : "hover:bg-gray-50",
                )}>
                <span
                  aria-hidden
                  className='size-2.5 shrink-0 rounded-sm'
                  style={{ backgroundColor: row.color }}
                />
                <span className='min-w-0 flex-1 truncate text-gray-700'>
                  {row.label}
                  <span className='ml-1.5 text-xs text-gray-400'>
                    {row.count} {row.count === 1 ? "expense" : "expenses"}
                  </span>
                </span>
                <span className='tabular-nums font-medium text-gray-900'>
                  {formatCurrency(row.total)}
                </span>
                <span className='w-10 text-right text-xs tabular-nums text-gray-400'>
                  {shareOf(row.total, total)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};

// The work orders most was spent in, largest first, each a bar of the
// largest. Clicking one shows only its expenses, and again shows all.
const TopWorkOrders = ({
  workOrders,
  workOrderCount,
  picked,
  onPick,
}: {
  workOrders: VendorExpenseBreakdown["work_orders"];
  workOrderCount: number;
  picked: string;
  onPick: (workOrderId: string) => void;
}) => {
  const largest = workOrders[0]?.total ?? 0;
  const rest = workOrderCount - workOrders.length;

  return (
    <Card
      title='Top work orders'
      aside={
        <span className='text-xs text-gray-500'>
          In {workOrderCount} work {workOrderCount === 1 ? "order" : "orders"}
        </span>
      }>
      <ul className='space-y-0.5'>
        {workOrders.map((workOrder) => {
          const isPicked = picked === String(workOrder.id);
          return (
            <li
              key={workOrder.id}
              className='flex items-center gap-1'>
              <button
                type='button'
                aria-pressed={isPicked}
                onClick={() => onPick(isPicked ? ALL : String(workOrder.id))}
                className={cn(
                  "grid min-w-0 flex-1 cursor-pointer grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
                  isPicked ? "bg-gray-100" : "hover:bg-gray-50",
                )}>
                <span className='truncate font-mono text-xs font-medium text-gray-700'>
                  {workOrder.code.toUpperCase()}
                </span>
                <span className='h-2'>
                  <span
                    className='block h-full rounded-r-[4px]'
                    style={{
                      width: `${largest > 0 ? Math.max(1, (workOrder.total / largest) * 100) : 0}%`,
                      backgroundColor: SPEND_COLOR,
                    }}
                  />
                </span>
                <span className='text-right text-sm tabular-nums font-medium text-gray-900'>
                  {formatCurrency(workOrder.total)}
                  <span className='ml-1 text-xs font-normal text-gray-400'>
                    ({workOrder.count})
                  </span>
                </span>
              </button>
              <Link
                href={`/dashboard/work-order/${workOrder.id}`}
                title='Open the work order'
                aria-label={`Open work order ${workOrder.code.toUpperCase()}`}
                className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700'>
                <ArrowUpRight className='size-3.5' />
              </Link>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <p className='mt-2 px-2 text-xs text-gray-400'>
          And {rest} more; pick one from the work order filter.
        </p>
      )}
    </Card>
  );
};

interface Props {
  breakdown: VendorExpenseBreakdown;
  offeredSources: ExpenseSource[];
  filters: VendorExpenseFilters;
  onChange: (filters: VendorExpenseFilters) => void;
}

const VendorExpenseBreakdownView = ({
  breakdown,
  offeredSources,
  filters,
  onChange,
}: Props) => {
  const { total, count, exceeded } = breakdown;

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 divide-x divide-y rounded-xl border border-gray-200 bg-white shadow-xs sm:grid-cols-4 sm:divide-y-0'>
        <Tile
          label='Spent'
          value={formatCurrency(total)}
        />
        <Tile
          label='Expenses'
          value={count.toLocaleString("en-IN")}
        />
        <Tile
          label='Average expense'
          value={formatCurrency(count > 0 ? total / count : 0)}
        />
        <Tile
          label='Over the estimate'
          value={formatCurrency(exceeded)}
          note={
            exceeded > 0 && (
              <span className='inline-flex items-center gap-1'>
                <AlertTriangle className='size-3 text-orange-500' />
                {shareOf(exceeded, total)} of the spend
              </span>
            )
          }
        />
      </div>

      <MonthChart
        months={breakdown.months}
        filters={filters}
        onPickMonths={(from, to) => onChange({ ...filters, from, to })}
      />

      <div className='grid gap-4 lg:grid-cols-2'>
        <SourceSplit
          sources={breakdown.sources}
          offered={offeredSources}
          total={total}
          picked={filters.source}
          onPick={(source) => onChange({ ...filters, source })}
        />
        <TopWorkOrders
          workOrders={breakdown.work_orders}
          workOrderCount={breakdown.work_order_count}
          picked={filters.workOrder}
          onPick={(workOrder) => onChange({ ...filters, workOrder })}
        />
      </div>
    </div>
  );
};

export default VendorExpenseBreakdownView;

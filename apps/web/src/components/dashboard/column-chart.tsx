"use client";
import React from "react";
import { formatCurrency } from "@pkg/utils";
import { cn } from "@/lib/utils";
import { formatCompactRupees, formatMonth } from "./format";

export type ChartMonth = { month: string; total: number };

// How many gridlines the value axis aims for above zero.
const TARGET_TICKS = 4;

// A round step that splits `max` into about TARGET_TICKS parts: 1, 2, 2.5
// or 5 times a power of ten.
const niceStep = (max: number) => {
  const rough = max / TARGET_TICKS;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * power >= rough) ?? 10;
  return step * power;
};

// The value axis: zero up to the first round figure at or above the
// largest month.
const axisTicks = (max: number) => {
  if (max <= 0) return [0];
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
};

// The month's name under its column; January and the first column carry
// the year too, as does every month named in a long trend.
const columnLabel = (month: string, index: number, step: number) =>
  index === 0 || month.endsWith("-01") || step > 1
    ? formatMonth(month)
    : formatMonth(month).split(" ")[0];

// How many months' names fit under the columns; longer trends name every
// second or third month instead.
const NAMED_MONTHS = 12;

// What was spent each month as columns on one value axis, the peak month
// labelled and every month's amount on hover or focus.
export const ColumnChart = ({ months }: { months: ChartMonth[] }) => {
  // Every `step`th month is named, twice as sparsely on phones.
  const step = Math.ceil(months.length / NAMED_MONTHS);
  const ticks = axisTicks(Math.max(...months.map((m) => m.total)));
  const top = ticks.at(-1) || 1;
  const peak = months.reduce(
    (best, m) => (m.total > best.total ? m : best),
    months[0]!,
  );

  return (
    <div className='flex flex-1 flex-col px-4 pt-6 pb-3'>
      <div className='relative min-h-48 flex-1'>
        {/* Gridlines with their figures, the baseline darker. */}
        {ticks.map((tick) => (
          <div
            key={tick}
            aria-hidden='true'
            className={cn(
              "absolute right-0 left-14 border-t",
              tick === 0 ? "border-gray-300" : "border-gray-100",
            )}
            style={{ bottom: `${(tick / top) * 100}%` }}>
            <span className='absolute top-0 right-full mr-2 -translate-y-1/2 text-[10px] leading-none tabular-nums whitespace-nowrap text-gray-400'>
              {formatCompactRupees(tick)}
            </span>
          </div>
        ))}

        <ul
          aria-label='Expenses by month'
          className='absolute inset-y-0 right-0 left-14 flex items-end'>
          {months.map((m) => {
            const height = (m.total / top) * 100;
            const isPeak = m === peak && m.total > 0;
            const tip = `${formatMonth(m.month, "long")}: ${formatCurrency(m.total)}`;

            return (
              <li
                key={m.month}
                tabIndex={0}
                aria-label={tip}
                className='group relative flex h-full flex-1 items-end justify-center outline-none'>
                {/* Hovered or focused, the column's slot lights up. */}
                <span
                  aria-hidden='true'
                  className='absolute inset-x-0.5 inset-y-0 rounded-md group-hover:bg-gray-50 group-focus-visible:bg-gray-50 group-focus-visible:ring-2 group-focus-visible:ring-cyan-600/40'
                />
                <span
                  aria-hidden='true'
                  className='relative w-3/5 max-w-6 rounded-t-[4px] bg-cyan-600 transition-colors group-hover:bg-cyan-700 group-focus-visible:bg-cyan-700'
                  style={{
                    height: `${height}%`,
                    minHeight: m.total > 0 ? 2 : 0,
                  }}
                />
                {isPeak && (
                  <span
                    aria-hidden='true'
                    className='absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap text-gray-700 group-hover:invisible group-focus-visible:invisible'
                    style={{ bottom: `calc(${height}% + 4px)` }}>
                    {formatCompactRupees(m.total)}
                  </span>
                )}
                <span
                  role='tooltip'
                  className='pointer-events-none absolute z-10 hidden -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-md group-hover:block group-focus-visible:block'
                  style={{ bottom: `calc(${height}% + 6px)`, left: "50%" }}>
                  <span className='block text-gray-300'>
                    {formatMonth(m.month, "long")}
                  </span>
                  <span className='font-semibold'>
                    {formatCurrency(m.total)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        aria-hidden='true'
        className='mt-1.5 ml-14 flex'>
        {months.map((m, index) => (
          <span
            key={m.month}
            className={cn(
              "flex-1 text-center text-[10px] whitespace-nowrap text-gray-500",
              index % step !== 0 && "invisible",
              index % (step * 2) !== 0 && "max-sm:invisible",
            )}>
            {columnLabel(m.month, index, step)}
          </span>
        ))}
      </div>
    </div>
  );
};

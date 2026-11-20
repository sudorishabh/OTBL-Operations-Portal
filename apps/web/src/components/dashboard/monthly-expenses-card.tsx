"use client";
import React, { useState } from "react";
import { formatCurrency } from "@pkg/utils";
import { cn } from "@/lib/utils";
import {
  CARD_ERROR,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { formatCompactRupees, formatMonth } from "./format";
import { useFinanceSummary } from "./use-dashboard";

type Month = { month: string; total: number };

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
// the year too.
const columnLabel = (month: string, index: number) =>
  index === 0 || month.endsWith("-01")
    ? formatMonth(month)
    : formatMonth(month).split(" ")[0];

const ColumnChart = ({ months }: { months: Month[] }) => {
  const ticks = axisTicks(Math.max(...months.map((m) => m.total)));
  const top = ticks.at(-1) || 1;
  const peak = months.reduce(
    (best, m) => (m.total > best.total ? m : best),
    months[0]!,
  );

  return (
    <div className='flex flex-1 flex-col px-4 pt-4 pb-3'>
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
            className='flex-1 truncate text-center text-[10px] text-gray-500'>
            {columnLabel(m.month, index)}
          </span>
        ))}
      </div>
    </div>
  );
};

// The same months as a table, newest first.
const MonthTable = ({ months }: { months: Month[] }) => (
  <div className='max-h-[15.5rem] overflow-y-auto'>
    <table className='w-full text-[13px]'>
      <thead className='sticky top-0 bg-gray-50'>
        <tr className='border-b border-gray-200 text-left text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase'>
          <th className='px-4 py-1.5 font-semibold'>Month</th>
          <th className='px-4 py-1.5 text-right font-semibold'>Spent</th>
        </tr>
      </thead>
      <tbody>
        {[...months].reverse().map((m) => (
          <tr
            key={m.month}
            className='border-b border-gray-100 last:border-0'>
            <td className='px-4 py-1.5 text-gray-700'>
              {formatMonth(m.month, "long")}
            </td>
            <td className='px-4 py-1.5 text-right tabular-nums text-gray-900'>
              {formatCurrency(m.total)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Chart or table, side by side as two buttons.
const ViewToggle = ({
  view,
  onChange,
}: {
  view: "chart" | "table";
  onChange: (view: "chart" | "table") => void;
}) => (
  <div
    role='group'
    aria-label='Show as'
    className='flex rounded-md border border-gray-200 bg-gray-50 p-0.5'>
    {(["chart", "table"] as const).map((option) => (
      <button
        key={option}
        type='button'
        aria-pressed={view === option}
        onClick={() => onChange(option)}
        className={cn(
          "rounded px-2 py-0.5 text-[11px] font-medium capitalize transition-colors",
          view === option
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        )}>
        {option}
      </button>
    ))}
  </div>
);

// What was spent in each of the last twelve months, as columns or a table.
export const MonthlyExpensesCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useFinanceSummary();
  const [view, setView] = useState<"chart" | "table">("chart");

  const yearTotal = data?.months.reduce((sum, m) => sum + m.total, 0) ?? 0;

  return (
    <DashboardCard
      className={className}
      title='Expenses by month'
      description={
        data
          ? `Last 12 months · ${formatCompactRupees(yearTotal)} in all`
          : "Last 12 months"
      }
      action={
        data && (
          <ViewToggle
            view={view}
            onChange={setView}
          />
        )
      }>
      {isPending ? (
        <CardSkeleton
          rows={5}
          label='Loading expenses by month'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : yearTotal === 0 ? (
        <CardMessage>No expenses in the last 12 months.</CardMessage>
      ) : view === "chart" ? (
        <ColumnChart months={data.months} />
      ) : (
        <MonthTable months={data.months} />
      )}
    </DashboardCard>
  );
};

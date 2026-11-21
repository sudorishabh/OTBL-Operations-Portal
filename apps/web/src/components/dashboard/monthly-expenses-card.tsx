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
import { ColumnChart, type ChartMonth } from "./column-chart";
import { ExpensesDialog } from "./expenses-dialog";
import { formatCompactRupees, formatMonth } from "./format";
import { useFinanceSummary } from "./use-dashboard";

type Month = ChartMonth;

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
  const [expanded, setExpanded] = useState(false);

  const yearTotal = data?.months.reduce((sum, m) => sum + m.total, 0) ?? 0;

  return (
    <>
      <DashboardCard
        className={className}
        onExpand={() => setExpanded(true)}
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
      <ExpensesDialog
        open={expanded}
        onOpenChange={setExpanded}
      />
    </>
  );
};

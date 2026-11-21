"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { formatCurrency } from "@pkg/utils";
import {
  ClearFiltersButton,
  FilterBar,
} from "@/components/filters/list-filters";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { CARD_ERROR, CardMessage, CardSkeleton } from "./dashboard-card";
import {
  ChoiceFilter,
  OfficeFilter,
  SiteProcessFilter,
  SourceFilter,
  type SiteProcess,
} from "./dashboard-filters";
import { formatCompactRupees, formatCount, formatMonth } from "./format";
import type { ExpenseSource } from "./labels";
import { ColumnChart } from "./column-chart";
import { DialogFigures, Refreshing, SectionDialog } from "./section-dialog";

type Trend = RouterOutputs["dashboardQuery"]["getExpenseTrend"];

const MONTH_RANGES = [
  { value: 6, label: "Last 6 months" },
  { value: 12, label: "Last 12 months" },
  { value: 24, label: "Last 24 months" },
  { value: 36, label: "Last 36 months" },
];

type Filters = {
  months: number;
  office_id?: number;
  process?: SiteProcess;
  source?: ExpenseSource;
};

const NO_FILTERS: Filters = { months: 12 };

const HEAD =
  "px-5 py-2 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase";

// Every month of the trend, newest first, with what went over the estimates
// and how many expenses it was.
const TrendTable = ({ months }: { months: Trend["months"] }) => (
  <div className='overflow-x-auto'>
    <table className='w-full min-w-[30rem] text-[13px]'>
      <thead className='border-y border-gray-200 bg-gray-50/60 text-left'>
        <tr>
          <th className={HEAD}>Month</th>
          <th className={`${HEAD} text-right`}>Spent</th>
          <th className={`${HEAD} text-right`}>Over estimate</th>
          <th className={`${HEAD} text-right`}>Expenses</th>
        </tr>
      </thead>
      <tbody>
        {[...months].reverse().map((month) => (
          <tr
            key={month.month}
            className='border-b border-gray-100 last:border-0'>
            <td className='px-5 py-1.5 text-gray-700'>
              {formatMonth(month.month, "long")}
            </td>
            <td className='px-5 py-1.5 text-right tabular-nums text-gray-900'>
              {formatCurrency(month.total)}
            </td>
            <td className='px-5 py-1.5 text-right tabular-nums text-gray-600'>
              {month.exceeded > 0 ? formatCurrency(month.exceeded) : "—"}
            </td>
            <td className='px-5 py-1.5 text-right tabular-nums text-gray-600'>
              {formatCount(month.count)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Expenses month by month, over a longer or shorter stretch, narrowed to an
// office, a process and what they were spent through.
export const ExpensesDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const setFilter = (next: Partial<Filters>) =>
    setFilters((current) => ({ ...current, ...next }));

  const query = trpc.dashboardQuery.getExpenseTrend.useQuery(filters, {
    enabled: open,
    placeholderData: keepPreviousData,
  }) as UseQueryResult<Trend>;
  const trend = query.data;

  const filtered =
    filters.office_id !== undefined ||
    filters.process !== undefined ||
    filters.source !== undefined ||
    filters.months !== NO_FILTERS.months;
  const range = MONTH_RANGES.find((r) => r.value === filters.months)!.label;

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Expenses by month'
      description={`${range}, every expense in the work orders you can see`}
      filters={
        <FilterBar>
          <ChoiceFilter
            label='Months shown'
            icon='range'
            value={filters.months}
            onChange={(months) => setFilter({ months })}
            options={MONTH_RANGES}
          />
          <OfficeFilter
            value={filters.office_id}
            onChange={(office_id) => setFilter({ office_id })}
          />
          <SiteProcessFilter
            value={filters.process}
            onChange={(process) => setFilter({ process })}
          />
          <SourceFilter
            value={filters.source}
            onChange={(source) => setFilter({ source })}
          />
          {filtered && (
            <ClearFiltersButton onClick={() => setFilters(NO_FILTERS)} />
          )}
        </FilterBar>
      }>
      {query.isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading expenses by month'
        />
      ) : !trend ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : (
        <Refreshing active={query.isPlaceholderData}>
          <DialogFigures
            figures={[
              {
                label: "Spent",
                value: formatCompactRupees(trend.total),
                hint: formatCurrency(trend.total),
              },
              {
                label: "Over the estimates",
                value: formatCompactRupees(trend.exceeded),
                hint: formatCurrency(trend.exceeded),
              },
              { label: "Expenses", value: formatCount(trend.count) },
              {
                label: "Monthly average",
                value: formatCompactRupees(trend.total / trend.months.length),
              },
            ]}
          />
          {trend.count === 0 ? (
            <CardMessage>No expenses match these filters.</CardMessage>
          ) : (
            <>
              <div className='flex h-80 flex-col'>
                <ColumnChart months={trend.months} />
              </div>
              <TrendTable months={trend.months} />
            </>
          )}
        </Refreshing>
      )}
    </SectionDialog>
  );
};

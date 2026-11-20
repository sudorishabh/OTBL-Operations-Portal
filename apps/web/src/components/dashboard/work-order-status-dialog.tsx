"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { formatCurrency } from "@pkg/utils";
import {
  ClearFiltersButton,
  FilterBar,
} from "@/components/filters/list-filters";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import {
  CARD_ERROR,
  CardLink,
  CardMessage,
  CardSkeleton,
  SubHeading,
} from "./dashboard-card";
import {
  FinancialYearFilter,
  OfficeFilter,
  WorkOrderProcessFilter,
  type WorkOrderProcess,
} from "./dashboard-filters";
import { formatCompactRupees, formatCount, formatShare } from "./format";
import { WORK_ORDER_PROCESSES } from "./labels";
import { MeterRow } from "./meter";
import { SegmentedBar } from "./segmented-bar";
import { DialogFigures, Refreshing, SectionDialog } from "./section-dialog";
import { StatusStripe, statusSegments } from "./status-parts";

type Summary = RouterOutputs["dashboardQuery"]["getWorkOrderSummary"];

type Filters = {
  office_id?: number;
  process_type?: WorkOrderProcess;
  financial_year?: string;
};

const HEAD =
  "px-5 py-2 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase";

// Work orders by the financial year they start in, newest first.
const YearTable = ({ years }: { years: Summary["byFinancialYear"] }) => (
  <div className='overflow-x-auto'>
    <table className='w-full min-w-[34rem] text-[13px]'>
      <thead className='border-y border-gray-200 bg-gray-50/60 text-left'>
        <tr>
          <th className={HEAD}>Financial year</th>
          <th className={HEAD}>Work orders</th>
          <th className={`${HEAD} text-right`}>Pending</th>
          <th className={`${HEAD} text-right`}>Completed</th>
          <th className={`${HEAD} text-right`}>Cancelled</th>
        </tr>
      </thead>
      <tbody>
        {years.map((year) => (
          <tr
            key={year.financial_year}
            className='border-b border-gray-100 last:border-0'>
            <td className='px-5 py-2 font-medium text-gray-800'>
              FY {year.financial_year}
            </td>
            <td className='w-[35%] px-5 py-2'>
              <span className='text-[12px] tabular-nums text-gray-700'>
                {formatCount(year.total)}
              </span>
              <StatusStripe {...year} />
            </td>
            <td className='px-5 py-2 text-right tabular-nums text-gray-700'>
              {formatCount(year.pending)}
            </td>
            <td className='px-5 py-2 text-right tabular-nums text-gray-700'>
              {formatCount(year.completed)}
              <span className='ml-1 text-[11px] text-gray-400'>
                {formatShare(year.completed, year.total)}
              </span>
            </td>
            <td className='px-5 py-2 text-right tabular-nums text-gray-700'>
              {formatCount(year.cancelled)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Work orders by status, with how each process, the field work and each
// financial year stand; narrowed to an office, a process and a year.
export const WorkOrderStatusDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [filters, setFilters] = useState<Filters>({});
  const setFilter = (next: Partial<Filters>) =>
    setFilters((current) => ({ ...current, ...next }));

  const query = trpc.dashboardQuery.getWorkOrderSummary.useQuery(filters, {
    enabled: open,
    placeholderData: keepPreviousData,
  }) as UseQueryResult<Summary>;
  const data = query.data;
  const filtered = Object.values(filters).some((value) => value !== undefined);

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Work order status'
      description='Every work order you can see, by status, process and financial year'
      filters={
        <FilterBar>
          <OfficeFilter
            value={filters.office_id}
            onChange={(office_id) => setFilter({ office_id })}
          />
          <WorkOrderProcessFilter
            value={filters.process_type}
            onChange={(process_type) => setFilter({ process_type })}
          />
          <FinancialYearFilter
            value={filters.financial_year}
            onChange={(financial_year) => setFilter({ financial_year })}
          />
          {filtered && <ClearFiltersButton onClick={() => setFilters({})} />}
        </FilterBar>
      }>
      {query.isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading work order status'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.total === 0 ? (
        <CardMessage>No work orders match these filters.</CardMessage>
      ) : (
        <Refreshing active={query.isPlaceholderData}>
          <DialogFigures
            figures={[
              { label: "Work orders", value: formatCount(data.total) },
              {
                label: "Pending",
                value: formatCount(data.pending),
                hint: formatShare(data.pending, data.total),
              },
              {
                label: "Completed",
                value: formatCount(data.completed),
                hint: formatShare(data.completed, data.total),
              },
              {
                label: "Cancelled",
                value: formatCount(data.cancelled),
                hint: formatShare(data.cancelled, data.total),
              },
              {
                label: "Income (SOR total)",
                value: formatCompactRupees(data.sorTotal),
                hint: formatCurrency(data.sorTotal),
              },
            ]}
          />

          <div className='space-y-5 px-5 py-4'>
            <SegmentedBar
              title='Work orders by status'
              segments={statusSegments(data)}
            />

            <div className='grid gap-5 md:grid-cols-2'>
              <div>
                <SubHeading>Completed by process</SubHeading>
                <div className='space-y-2.5'>
                  {WORK_ORDER_PROCESSES.map(({ value, label }) => {
                    const counts = data.byProcess[value];
                    if (!counts) return null;
                    return (
                      <MeterRow
                        key={value}
                        label={label}
                        value={counts.completed}
                        total={counts.total}
                        detail={`${formatCount(counts.pending)} pending · ${formatCount(counts.cancelled)} cancelled`}
                      />
                    );
                  })}
                </div>
              </div>
              <div>
                <SubHeading>Field progress</SubHeading>
                <div className='space-y-2.5'>
                  <MeterRow
                    label='Sites completed'
                    value={data.sites.completed}
                    total={data.sites.total}
                  />
                  <MeterRow
                    label='Restorations completed'
                    value={data.restorations.completed}
                    total={data.restorations.total}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className='flex items-center justify-between gap-3 px-5 pb-2'>
            <SubHeading>By financial year</SubHeading>
            <CardLink href='/dashboard/work-order'>Open work orders</CardLink>
          </div>
          <YearTable years={data.byFinancialYear} />
        </Refreshing>
      )}
    </SectionDialog>
  );
};

"use client";
import React, { useState } from "react";
import Link from "next/link";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { CalendarClock, TriangleAlert } from "lucide-react";
import { constants } from "@pkg/utils";
import {
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
} from "@/components/filters/list-filters";
import TablePagination from "@/components/shared/table-pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { PaperworkFollowUps, dueLabel } from "./attention-parts";
import { CARD_ERROR, CardMessage, CardSkeleton } from "./dashboard-card";
import {
  ChoiceFilter,
  FinancialYearFilter,
  OfficeFilter,
  WorkOrderProcessFilter,
  type WorkOrderProcess,
} from "./dashboard-filters";
import { formatCount, formatDay } from "./format";
import { processLabel } from "./labels";
import { Refreshing, SectionDialog } from "./section-dialog";
import { useModuleCounts } from "./use-dashboard";

const { PROPOSAL_STATUS } = constants;

type Attention = RouterOutputs["dashboardQuery"]["getAttention"];
type Deadlines = RouterOutputs["dashboardQuery"]["getDeadlines"];
type Kind = "overdue" | "ending";

const WINDOWS = [7, 15, 30, 60, 90, 180].map((days) => ({
  value: days,
  label: `Ending within ${days} days`,
}));

const PAGE_SIZE = 10;

type Filters = {
  office_id?: number;
  process_type?: WorkOrderProcess;
  financial_year?: string;
  days: number;
};

const NO_FILTERS: Filters = { days: 30 };

const HEAD =
  "px-5 py-2 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase";

// The two lists, side by side as tabs, each with its count.
const KindTabs = ({
  kind,
  onChange,
  overdue,
  ending,
  days,
}: {
  kind: Kind;
  onChange: (kind: Kind) => void;
  overdue: number;
  ending: number;
  days: number;
}) => (
  <div
    role='tablist'
    aria-label='Deadlines'
    className='flex gap-1 rounded-lg bg-gray-100 p-1'>
    {(
      [
        {
          value: "overdue",
          label: "Past their end date",
          count: overdue,
          Icon: TriangleAlert,
          iconClass: "text-rose-600",
        },
        {
          value: "ending",
          label: `Ending in ${days} days`,
          count: ending,
          Icon: CalendarClock,
          iconClass: "text-amber-600",
        },
      ] as const
    ).map((tab) => (
      <button
        key={tab.value}
        type='button'
        role='tab'
        aria-selected={kind === tab.value}
        onClick={() => onChange(tab.value)}
        className={cn(
          "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
          kind === tab.value
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700",
        )}>
        <tab.Icon
          aria-hidden='true'
          className={cn("size-3.5", tab.iconClass)}
        />
        <span className='truncate'>{tab.label}</span>
        <span className='rounded-full bg-gray-200/80 px-1.5 text-[11px] tabular-nums text-gray-700'>
          {formatCount(tab.count)}
        </span>
      </button>
    ))}
  </div>
);

// A page of work orders against their end date, each leading to its page.
const DeadlineTable = ({
  rows,
  late,
}: {
  rows: Deadlines["workOrders"];
  late: boolean;
}) => (
  <div className='overflow-x-auto'>
    <table className='w-full min-w-[40rem] text-[13px]'>
      <thead className='border-y border-gray-200 bg-gray-50/60 text-left'>
        <tr>
          <th className={HEAD}>Work order</th>
          <th className={HEAD}>Client · office</th>
          <th className={HEAD}>Process</th>
          <th className={`${HEAD} text-right`}>Ends</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className='border-b border-gray-100 last:border-0'>
            <td className='px-5 py-2'>
              <Link
                href={`/dashboard/work-order/${row.id}`}
                className='font-mono font-medium text-cyan-700 hover:underline'>
                {row.code.toUpperCase()}
              </Link>
              {row.purchase_order_code && (
                <span className='block font-mono text-[11px] text-gray-400'>
                  {row.purchase_order_code}
                </span>
              )}
            </td>
            <td className='max-w-[16rem] px-5 py-2'>
              <span className='block truncate text-gray-700'>
                {row.client_name ?? "—"}
              </span>
              <span className='block truncate text-[11px] text-gray-400'>
                {row.office_name ?? "—"}
              </span>
            </td>
            <td className='px-5 py-2 text-gray-600'>
              {processLabel(row.process_type)}
            </td>
            <td className='px-5 py-2 text-right whitespace-nowrap'>
              <span className='block tabular-nums text-gray-700'>
                {formatDay(row.end_date)}
              </span>
              <span
                className={cn(
                  "block text-[11px] font-medium",
                  late ? "text-rose-600" : "text-amber-700",
                )}>
                {dueLabel(row.end_date)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Every pending work order past its end date or ending soon, a page at a
// time and searchable, with the paperwork still to come; all narrowed to an
// office, a process and a financial year.
export const AttentionDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [kind, setKind] = useState<Kind>("overdue");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  // A new filter starts the list again from its first page.
  const setFilter = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const attentionQuery = trpc.dashboardQuery.getAttention.useQuery(filters, {
    enabled: open,
    placeholderData: keepPreviousData,
  }) as UseQueryResult<Attention>;
  const deadlinesQuery = trpc.dashboardQuery.getDeadlines.useQuery(
    {
      ...filters,
      kind,
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: open, placeholderData: keepPreviousData },
  ) as UseQueryResult<Deadlines>;
  // Proposals aren't kept by process or year, so they show unfiltered only.
  const proposals = useModuleCounts().data?.proposals;

  const attention = attentionQuery.data;
  const deadlines = deadlinesQuery.data;
  const filtered =
    filters.office_id !== undefined ||
    filters.process_type !== undefined ||
    filters.financial_year !== undefined ||
    filters.days !== NO_FILTERS.days;

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Needs attention'
      description='Pending work orders against their end dates, and records waiting on documents'
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
          <ChoiceFilter
            label='Ending soon means'
            icon='range'
            value={filters.days}
            onChange={(days) => setFilter({ days })}
            options={WINDOWS}
          />
          {filtered && (
            <ClearFiltersButton
              onClick={() => {
                setFilters(NO_FILTERS);
                setPage(1);
              }}
            />
          )}
        </FilterBar>
      }>
      {attentionQuery.isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading what needs attention'
        />
      ) : !attention ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : (
        <Refreshing
          active={
            attentionQuery.isPlaceholderData || deadlinesQuery.isPlaceholderData
          }>
          <div className='space-y-3 px-5 pt-4 pb-3'>
            <KindTabs
              kind={kind}
              onChange={(next) => {
                setKind(next);
                setPage(1);
              }}
              overdue={attention.overdue.count}
              ending={attention.endingSoon.count}
              days={attention.endingSoon.days}
            />
            <SearchFilter
              label='Search these work orders'
              placeholder='Search by code, purchase order, client, office...'
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              className='sm:w-96'
            />
          </div>

          {deadlinesQuery.isPending ? (
            <CardSkeleton
              rows={4}
              label='Loading work orders'
            />
          ) : !deadlines ? (
            <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
          ) : deadlines.workOrders.length === 0 ? (
            <CardMessage>
              {debouncedSearch
                ? "No work order matches the search."
                : kind === "overdue"
                  ? "No pending work order is past its end date."
                  : `No pending work order ends in the next ${attention.endingSoon.days} days.`}
            </CardMessage>
          ) : (
            <>
              <DeadlineTable
                rows={deadlines.workOrders}
                late={kind === "overdue"}
              />
              <TablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={deadlines.pagination.total}
                noun='work orders'
                onPageChange={setPage}
                className='border-t border-gray-200 px-5 py-2.5'
              />
            </>
          )}

          <div className='border-t border-gray-200 px-5 py-4'>
            <PaperworkFollowUps
              attention={attention}
              proposalsPending={
                filters.process_type ||
                filters.financial_year ||
                filters.office_id
                  ? undefined
                  : proposals?.[PROPOSAL_STATUS.PENDING]
              }
            />
          </div>
        </Refreshing>
      )}
    </SectionDialog>
  );
};

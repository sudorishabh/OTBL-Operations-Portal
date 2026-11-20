"use client";
import React, { useState } from "react";
import Link from "next/link";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { capitalFirstLetter, formatCurrency } from "@pkg/utils";
import {
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
} from "@/components/filters/list-filters";
import StartEndDateFilter from "@/components/filters/start-end-date-filter";
import TablePagination from "@/components/shared/table-pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { CARD_ERROR, CardMessage, CardSkeleton } from "./dashboard-card";
import {
  ChoiceFilter,
  OfficeFilter,
  SiteProcessFilter,
  SourceFilter,
  type SiteProcess,
} from "./dashboard-filters";
import {
  formatCompactRupees,
  formatCount,
  formatDay,
  formatShare,
} from "./format";
import type { ExpenseSource } from "./labels";
import { DialogFigures, Refreshing, SectionDialog } from "./section-dialog";

type VendorSpend = RouterOutputs["dashboardQuery"]["getVendorSpend"];
type Sort = "spent" | "expenses" | "name";

const SORTS: { value: Sort; label: string }[] = [
  { value: "spent", label: "Most spent first" },
  { value: "expenses", label: "Most expenses first" },
  { value: "name", label: "By name" },
];

const PAGE_SIZE = 10;

type Filters = {
  from?: string;
  to?: string;
  office_id?: number;
  process?: SiteProcess;
  source?: ExpenseSource;
};

const HEAD =
  "px-5 py-2 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase";

// A page of vendors with what was spent with them, each leading to its page.
const VendorTable = ({
  vendors,
  total,
}: {
  vendors: VendorSpend["vendors"];
  // What was spent with every vendor the filters leave, for each one's share.
  total: number;
}) => (
  <div className='overflow-x-auto'>
    <table className='w-full min-w-[46rem] text-[13px]'>
      <thead className='border-y border-gray-200 bg-gray-50/60 text-left'>
        <tr>
          <th className={HEAD}>Vendor</th>
          <th className={`${HEAD} text-right`}>Spent</th>
          <th className={`${HEAD} text-right`}>Over estimate</th>
          <th className={`${HEAD} text-right`}>Expenses</th>
          <th className={`${HEAD} text-right`}>Work orders</th>
          <th className={`${HEAD} text-right`}>Last spent</th>
        </tr>
      </thead>
      <tbody>
        {vendors.map((vendor) => (
          <tr
            key={vendor.id}
            className='border-b border-gray-100 last:border-0'>
            <td className='max-w-[16rem] px-5 py-2'>
              <Link
                href={`/dashboard/vendor/${vendor.id}`}
                className='block truncate font-medium text-gray-800 hover:text-emerald-700 hover:underline'>
                {capitalFirstLetter(vendor.name)}
              </Link>
              <span className='block text-[11px] text-gray-400'>
                {vendor.code}
              </span>
            </td>
            <td
              className='px-5 py-2 text-right whitespace-nowrap'
              title={formatCurrency(vendor.total)}>
              <span className='block tabular-nums text-gray-900'>
                {formatCompactRupees(vendor.total)}
              </span>
              <span className='block text-[11px] text-gray-400'>
                {formatShare(vendor.total, total)}
              </span>
            </td>
            <td className='px-5 py-2 text-right tabular-nums text-gray-600'>
              {vendor.exceeded > 0 ? formatCompactRupees(vendor.exceeded) : "—"}
            </td>
            <td className='px-5 py-2 text-right tabular-nums text-gray-600'>
              {formatCount(vendor.count)}
            </td>
            <td className='px-5 py-2 text-right tabular-nums text-gray-600'>
              {formatCount(vendor.work_order_count)}
            </td>
            <td className='px-5 py-2 text-right whitespace-nowrap text-gray-600'>
              {vendor.last_spent_on ? formatDay(vendor.last_spent_on) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Every vendor anything has been spent with, a page at a time: searchable,
// narrowed by days, office, process and what was spent through, and sorted
// by spending, expenses or name.
export const VendorsDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [filters, setFilters] = useState<Filters>({});
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("spent");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  // A new filter, search or order starts again from the first page.
  const setFilter = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const query = trpc.dashboardQuery.getVendorSpend.useQuery(
    {
      ...filters,
      search: debouncedSearch || undefined,
      sort,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: open, placeholderData: keepPreviousData },
  ) as UseQueryResult<VendorSpend>;
  const data = query.data;
  const filtered =
    search !== "" ||
    sort !== "spent" ||
    Object.values(filters).some((value) => value !== undefined);

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Vendors by spending'
      description='Every vendor anything has been spent with in the work orders you can see'
      filters={
        <FilterBar>
          <SearchFilter
            label='Search vendors'
            placeholder='Search by name or code...'
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <StartEndDateFilter
            from={filters.from}
            to={filters.to}
            onChange={(from, to) => setFilter({ from, to })}
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
          <ChoiceFilter
            label='Sort'
            value={sort}
            onChange={(next) => {
              setSort(next);
              setPage(1);
            }}
            options={SORTS}
          />
          {filtered && (
            <ClearFiltersButton
              onClick={() => {
                setFilters({});
                setSearch("");
                setSort("spent");
                setPage(1);
              }}
            />
          )}
        </FilterBar>
      }>
      {query.isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading vendors'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.vendors.length === 0 ? (
        <CardMessage>No vendor matches these filters.</CardMessage>
      ) : (
        <Refreshing active={query.isPlaceholderData}>
          <DialogFigures
            figures={[
              {
                label: "Spent with vendors",
                value: formatCompactRupees(data.total),
                hint: formatCurrency(data.total),
              },
              {
                label: "Vendors",
                value: formatCount(data.pagination.total),
              },
              {
                label: "Average per vendor",
                value: formatCompactRupees(
                  data.total / Math.max(data.pagination.total, 1),
                ),
              },
            ]}
          />
          <VendorTable
            vendors={data.vendors}
            total={data.total}
          />
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.pagination.total}
            noun='vendors'
            onPageChange={setPage}
            className='border-t border-gray-200 px-5 py-2.5'
          />
        </Refreshing>
      )}
    </SectionDialog>
  );
};

"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { capitalFirstLetter, formatCurrency } from "@pkg/utils";
import {
  ClearFiltersButton,
  FilterBar,
} from "@/components/filters/list-filters";
import StartEndDateFilter from "@/components/filters/start-end-date-filter";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import {
  CARD_ERROR,
  CardMessage,
  CardSkeleton,
  SubHeading,
} from "./dashboard-card";
import {
  OfficeFilter,
  SiteProcessFilter,
  type SiteProcess,
} from "./dashboard-filters";
import {
  formatCompactRupees,
  formatCount,
  formatCountOf,
  formatShare,
} from "./format";
import { processLabel, sourceLabel } from "./labels";
import { RankedBars, type RankedBar } from "./ranked-bars";
import { DialogFigures, Refreshing, SectionDialog } from "./section-dialog";

type Finance = RouterOutputs["dashboardQuery"]["getFinanceSummary"];

type Filters = {
  from?: string;
  to?: string;
  office_id?: number;
  process?: SiteProcess;
};

const largestFirst = (rows: RankedBar[]) =>
  [...rows].sort((a, b) => b.value - a.value);

// Where the money went over any stretch of days: what it was spent through,
// on which process and with which vendors, and how much went over the
// estimates; narrowed to an office and a process.
export const SpendingDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [filters, setFilters] = useState<Filters>({});
  const setFilter = (next: Partial<Filters>) =>
    setFilters((current) => ({ ...current, ...next }));

  const query = trpc.dashboardQuery.getFinanceSummary.useQuery(filters, {
    enabled: open,
    placeholderData: keepPreviousData,
  }) as UseQueryResult<Finance>;
  const data = query.data;
  const filtered = Object.values(filters).some((value) => value !== undefined);

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Spending breakdown'
      description='Every expense in the work orders you can see, by what it was spent through, process and vendor'
      filters={
        <FilterBar>
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
          {filtered && <ClearFiltersButton onClick={() => setFilters({})} />}
        </FilterBar>
      }>
      {query.isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading the spending breakdown'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.count === 0 ? (
        <CardMessage>No expenses match these filters.</CardMessage>
      ) : (
        <Refreshing active={query.isPlaceholderData}>
          <DialogFigures
            figures={[
              {
                label: "Spent",
                value: formatCompactRupees(data.spent),
                hint: formatCurrency(data.spent),
              },
              {
                label: "Over the estimates",
                value: formatCompactRupees(data.exceeded),
                hint: `${formatShare(data.exceeded, data.spent)} of all spent`,
              },
              { label: "Expenses", value: formatCount(data.count) },
              { label: "Vendors paid", value: formatCount(data.vendorCount) },
            ]}
          />

          <div className='grid gap-6 px-5 py-4 md:grid-cols-2'>
            <div>
              <SubHeading>By what it was spent through</SubHeading>
              <RankedBars
                title='Expenses by what they were spent through'
                formatValue={formatCompactRupees}
                rows={largestFirst(
                  data.sources.map((source) => ({
                    key: source.source,
                    label: sourceLabel(source.source),
                    note: `${formatShare(source.total, data.spent)} · ${formatCountOf(source.count, "expense")}`,
                    value: source.total,
                  })),
                )}
              />
            </div>

            <div>
              <SubHeading>By process</SubHeading>
              <RankedBars
                title='Expenses by process'
                formatValue={formatCompactRupees}
                rows={largestFirst(
                  Object.entries(data.byProcess).map(([process, total]) => ({
                    key: process,
                    label: processLabel(process),
                    note: formatShare(total, data.spent),
                    value: total,
                  })),
                )}
              />
            </div>

            {data.topVendors && data.topVendors.length > 0 && (
              <div className='md:col-span-2'>
                <SubHeading>Vendors most was spent with</SubHeading>
                <RankedBars
                  title='Vendors most was spent with'
                  formatValue={formatCompactRupees}
                  rows={data.topVendors.map((vendor) => ({
                    key: String(vendor.id),
                    label: capitalFirstLetter(vendor.name),
                    note: `${vendor.code} · ${formatCountOf(vendor.count, "expense")}`,
                    value: vendor.total,
                    href: `/dashboard/vendor/${vendor.id}`,
                  }))}
                />
              </div>
            )}
          </div>
        </Refreshing>
      )}
    </SectionDialog>
  );
};

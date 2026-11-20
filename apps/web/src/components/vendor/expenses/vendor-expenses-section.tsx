"use client";
import React, { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarRange,
  ClipboardList,
  Layers,
  ReceiptIndianRupee,
  Workflow,
} from "lucide-react";
import { constants } from "@pkg/utils";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
  type FilterOption,
} from "@/components/filters/list-filters";
import VendorExpenseBreakdownView from "./vendor-expense-breakdown";
import VendorExpenseList from "./vendor-expense-list";
import {
  NO_FILTERS,
  SOURCES,
  isFiltered,
  monthLabel,
  toInput,
  type ExpenseSource,
  type VendorExpenseFilters,
  type VendorExpenseSort,
} from "./vendor-expense-filters";

const { WO_PROCESS } = constants;

type ExpenseChoices =
  RouterOutputs["contractorQuery"]["getContractorExpenseChoices"];
type WorkOrderResults =
  RouterOutputs["contractorQuery"]["findContractorExpenseWorkOrders"];

const PROCESS_LABELS: Record<string, string> = {
  [WO_PROCESS.RESTORATION]: "Restoration",
  [WO_PROCESS.BIOREMEDIATION]: "Bioremediation",
};

// Everything spent with a vendor, in the work orders the user can see:
// the filters, what the expenses they leave come to, and the expenses
// themselves. The filters scope everything below them.
const VendorExpensesSection = ({ contractorId }: { contractorId: number }) => {
  const [filters, setFilters] = useState<VendorExpenseFilters>(NO_FILTERS);
  const [sort, setSort] = useState<VendorExpenseSort>("newest");
  const search = useDebounce(filters.search, 300);
  const input = toInput(contractorId, filters, search);

  const choicesQuery =
    trpc.contractorQuery.getContractorExpenseChoices.useQuery({
      id: contractorId,
    });
  const breakdownQuery =
    trpc.contractorQuery.getContractorExpenseBreakdown.useQuery(input, {
      placeholderData: keepPreviousData,
    });

  const choices = choicesQuery.data as ExpenseChoices | undefined;
  const breakdown = breakdownQuery.data;

  // A vendor can work in many work orders: they are searched on the server,
  // a few at a time, keeping the one picked.
  const [workOrderSearch, setWorkOrderSearch] = useState("");
  const debouncedWorkOrderSearch = useDebounce(workOrderSearch.trim(), 300);
  const workOrdersQuery =
    trpc.contractorQuery.findContractorExpenseWorkOrders.useQuery(
      {
        id: contractorId,
        search: debouncedWorkOrderSearch || undefined,
        selected_id:
          filters.workOrder === ALL ? undefined : Number(filters.workOrder),
      },
      {
        enabled: (choices?.work_order_count ?? 0) > 1,
        placeholderData: keepPreviousData,
      },
    );
  const workOrderResults = workOrdersQuery.data as WorkOrderResults | undefined;
  const set =
    <K extends keyof VendorExpenseFilters>(key: K) =>
    (value: VendorExpenseFilters[K]) =>
      setFilters((current) => ({ ...current, [key]: value }));

  const months = choices?.months ?? [];
  const fromOptions: FilterOption[] = [
    { value: ALL, label: "From the first month" },
    ...[...months]
      .reverse()
      .filter((month) => filters.to === ALL || month <= filters.to)
      .map((month) => ({ value: month, label: `From ${monthLabel(month)}` })),
  ];
  const toOptions: FilterOption[] = [
    { value: ALL, label: "To the latest month" },
    ...months
      .filter((month) => filters.from === ALL || month >= filters.from)
      .map((month) => ({ value: month, label: `To ${monthLabel(month)}` })),
  ];
  const toWorkOrderOption = (workOrder: { id: number; code: string }) => ({
    value: String(workOrder.id),
    label: workOrder.code.toUpperCase(),
  });
  const workOrderOptions: FilterOption[] = (
    workOrderResults?.work_orders ?? []
  ).map(toWorkOrderOption);
  const pickedWorkOrder = workOrderResults?.selected
    ? toWorkOrderOption(workOrderResults.selected)
    : undefined;
  const offeredSources = (choices?.sources ?? []) as ExpenseSource[];

  const heading = (
    <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
      <ReceiptIndianRupee className='size-4 text-gray-400' />
      Expenses
    </h3>
  );

  if (choicesQuery.isLoading || (breakdownQuery.isLoading && !breakdown)) {
    return (
      <section className='space-y-2'>
        {heading}
        <p className='rounded-lg border border-dashed py-8 text-center text-xs text-gray-400'>
          Loading expenses…
        </p>
      </section>
    );
  }

  if (months.length === 0) {
    return (
      <section className='space-y-2'>
        {heading}
        <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
          No expenses recorded under this vendor yet.
        </p>
      </section>
    );
  }

  return (
    <section className='space-y-3'>
      {heading}

      <FilterBar>
        <SearchFilter
          label='Search expenses'
          placeholder='Search description, invoice, order, site'
          value={filters.search}
          onChange={set("search")}
        />
        <SelectFilter
          label='From month'
          Icon={CalendarRange}
          value={filters.from}
          onChange={set("from")}
          options={fromOptions}
        />
        <SelectFilter
          label='To month'
          Icon={CalendarRange}
          value={filters.to}
          onChange={set("to")}
          options={toOptions}
        />
        {(choices?.work_order_count ?? 0) > 1 && (
          <ComboboxFilter
            label='Work order'
            allLabel='All work orders'
            Icon={ClipboardList}
            value={filters.workOrder}
            onChange={set("workOrder")}
            options={workOrderOptions}
            isLoading={workOrdersQuery.isLoading}
            searchPlaceholder='Search work orders by code'
            onSearchChange={setWorkOrderSearch}
            selectedOption={pickedWorkOrder}
            hasMore={!!workOrderResults?.has_more}
          />
        )}
        {(choices?.processes.length ?? 0) > 1 && (
          <SelectFilter
            label='Process'
            Icon={Workflow}
            value={filters.process}
            onChange={set("process")}
            options={[
              { value: ALL, label: "All processes" },
              ...(choices?.processes ?? []).map((process) => ({
                value: process,
                label: PROCESS_LABELS[process] ?? process,
              })),
            ]}
          />
        )}
        {offeredSources.length > 1 && (
          <SelectFilter
            label='Order type'
            Icon={Layers}
            value={filters.source}
            onChange={set("source")}
            options={[
              { value: ALL, label: "All order types" },
              ...SOURCES.filter((source) =>
                offeredSources.includes(source.value),
              ).map((source) => ({ value: source.value, label: source.label })),
            ]}
          />
        )}
        {choices?.has_exceeded && (
          <SelectFilter
            label='Estimate'
            Icon={AlertTriangle}
            value={filters.exceeded ? "exceeded" : ALL}
            onChange={(value) => set("exceeded")(value === "exceeded")}
            options={[
              { value: ALL, label: "Within or over the estimate" },
              { value: "exceeded", label: "Over the estimate" },
            ]}
          />
        )}
        {isFiltered(filters) && (
          <ClearFiltersButton onClick={() => setFilters(NO_FILTERS)} />
        )}
      </FilterBar>

      {breakdown && (
        // While new figures load, the last ones stay, dimmed.
        <div
          className={cn(
            "transition-opacity",
            breakdownQuery.isPlaceholderData && "opacity-60",
          )}>
          <VendorExpenseBreakdownView
            breakdown={breakdown}
            offeredSources={offeredSources}
            filters={filters}
            onChange={setFilters}
          />
        </div>
      )}

      <VendorExpenseList
        input={input}
        sort={sort}
        onSortChange={setSort}
      />
    </section>
  );
};

export default VendorExpensesSection;

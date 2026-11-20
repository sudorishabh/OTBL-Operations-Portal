"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import {
  ALL,
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import TablePagination from "@/components/shared/table-pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { CARD_ERROR, CardMessage, CardSkeleton } from "./dashboard-card";
import {
  ChoiceFilter,
  OfficeFilter,
  WorkOrderProcessFilter,
  type WorkOrderProcess,
} from "./dashboard-filters";
import { Refreshing, SectionDialog } from "./section-dialog";
import { WorkOrderTable } from "./work-order-table";

type WorkOrdersPage = RouterOutputs["workOrderQuery"]["getAll"];
type Sort = "latest" | "oldest" | "ending_soonest";

const STATUSES = [
  { value: ALL, label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "latest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "ending_soonest", label: "Ending soonest" },
];

const PAGE_SIZE = 10;

type Filters = {
  status: string;
  office_id?: number;
  process_type?: WorkOrderProcess;
};

const NO_FILTERS: Filters = { status: ALL };

// The work orders behind the recent list, a page at a time: searchable,
// narrowed by status, office and process, and sorted by when they were
// added or when they end.
export const WorkOrdersDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  // A new filter, search or order starts again from the first page.
  const setFilter = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const query = trpc.workOrderQuery.getAll.useQuery(
    {
      page,
      limit: PAGE_SIZE,
      searchQuery: debouncedSearch || undefined,
      status: filters.status,
      office_id: filters.office_id,
      process_type: filters.process_type,
      workOrderOrder: sort,
    },
    { enabled: open, placeholderData: keepPreviousData },
  ) as UseQueryResult<WorkOrdersPage>;
  const data = query.data;
  const filtered =
    search !== "" ||
    sort !== "latest" ||
    filters.status !== ALL ||
    filters.office_id !== undefined ||
    filters.process_type !== undefined;

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Work orders'
      description='Every work order you can see, newest first unless sorted otherwise'
      filters={
        <FilterBar>
          <SearchFilter
            label='Search work orders'
            placeholder='Search by code, purchase order, agreement, client...'
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
          />
          <SelectFilter
            label='Status'
            value={filters.status}
            onChange={(status) => setFilter({ status })}
            options={STATUSES}
          />
          <OfficeFilter
            value={filters.office_id}
            onChange={(office_id) => setFilter({ office_id })}
          />
          <WorkOrderProcessFilter
            value={filters.process_type}
            onChange={(process_type) => setFilter({ process_type })}
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
                setFilters(NO_FILTERS);
                setSearch("");
                setSort("latest");
                setPage(1);
              }}
            />
          )}
        </FilterBar>
      }>
      {query.isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading work orders'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.workOrders.length === 0 ? (
        <CardMessage>No work order matches these filters.</CardMessage>
      ) : (
        <Refreshing active={query.isPlaceholderData}>
          <WorkOrderTable
            workOrders={data.workOrders}
            dateColumn={sort === "ending_soonest" ? "ends" : "updated"}
          />
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.pagination.total}
            noun='work orders'
            onPageChange={setPage}
            className='border-t border-gray-200 px-5 py-2.5'
          />
        </Refreshing>
      )}
    </SectionDialog>
  );
};

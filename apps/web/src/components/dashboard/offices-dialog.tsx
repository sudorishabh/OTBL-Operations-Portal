"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import {
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
} from "@/components/filters/list-filters";
import TablePagination from "@/components/shared/table-pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { CARD_ERROR, CardMessage, CardSkeleton } from "./dashboard-card";
import { ChoiceFilter, StateFilter } from "./dashboard-filters";
import { OfficeTable } from "./office-table";
import { Refreshing, SectionDialog } from "./section-dialog";

type Breakdown = RouterOutputs["dashboardQuery"]["getOfficeBreakdown"];
type Sort = "pending" | "total" | "spent" | "name";

const SORTS: { value: Sort; label: string }[] = [
  { value: "pending", label: "Most pending first" },
  { value: "total", label: "Most work orders first" },
  { value: "spent", label: "Most spent first" },
  { value: "name", label: "By name" },
];

const PAGE_SIZE = 10;

// Every office with work orders the user can see, a page at a time:
// searchable, narrowed to a state and sorted by pending work, work orders,
// spending or name.
export const OfficesDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [search, setSearch] = useState("");
  const [state, setState] = useState<string | undefined>();
  const [sort, setSort] = useState<Sort>("pending");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const query = trpc.dashboardQuery.getOfficeBreakdown.useQuery(
    {
      search: debouncedSearch || undefined,
      state,
      sort,
      page,
      limit: PAGE_SIZE,
    },
    { enabled: open, placeholderData: keepPreviousData },
  ) as UseQueryResult<Breakdown>;
  const data = query.data;
  const filtered = search !== "" || state !== undefined || sort !== "pending";

  // A new search, state or order starts again from the first page.
  const restart =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  return (
    <SectionDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Offices'
      description='Every office with work orders you can see, with its work, sites and spending'
      filters={
        <FilterBar>
          <SearchFilter
            label='Search offices'
            placeholder='Search by name, code or city...'
            value={search}
            onChange={restart(setSearch)}
          />
          <StateFilter
            value={state}
            onChange={restart(setState)}
          />
          <ChoiceFilter
            label='Sort'
            value={sort}
            onChange={restart(setSort)}
            options={SORTS}
          />
          {filtered && (
            <ClearFiltersButton
              onClick={() => {
                setSearch("");
                setState(undefined);
                setSort("pending");
                setPage(1);
              }}
            />
          )}
        </FilterBar>
      }>
      {query.isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading offices'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.offices.length === 0 ? (
        <CardMessage>No office matches these filters.</CardMessage>
      ) : (
        <Refreshing active={query.isPlaceholderData}>
          <OfficeTable offices={data.offices} />
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.pagination.total}
            noun='offices'
            onPageChange={setPage}
            className='border-t border-gray-200 px-5 py-2.5'
          />
        </Refreshing>
      )}
    </SectionDialog>
  );
};

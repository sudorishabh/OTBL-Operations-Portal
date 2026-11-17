import React, { useEffect, useRef, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import {
  ALL,
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import Error from "@/components/shared/error";
import TablePagination, {
  scrollIntoViewIfAbove,
} from "@/components/shared/table-pagination";
import { OfficeSitesTableSkeleton } from "@/components/skeleton/office-site/office-site-skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageNumber } from "@/hooks/usePageNumber";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { SitesTable } from "../office-site-table";
import type { OfficeDetails } from "./office-types";

const PAGE_SIZE = 10;

type SitesPage = RouterOutputs["siteQuery"]["getSitesByOfficeId"];
type SiteStatus = "all" | "active" | "inactive";

const STATUS_OPTIONS = [
  { label: "All sites", value: ALL },
  { label: "Active sites", value: "active" },
  { label: "Inactive sites", value: "inactive" },
];

// The office's sites, searchable and a page at a time, each with its work
// orders and edit options.
const OfficeSites = ({ details }: { details: OfficeDetails }) => {
  const { office, sites: counts, canManage } = details;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SiteStatus>(ALL);
  const debouncedSearch = useDebounce(search.trim(), 300);
  const isFiltered = search !== "" || status !== ALL;
  const [page, setPage] = usePageNumber({ status, search: debouncedSearch });
  const listRef = useRef<HTMLDivElement>(null);

  // The rows on screen stay while another page or filter loads.
  const { data, isLoading, isPlaceholderData, error } =
    trpc.siteQuery.getSitesByOfficeId.useQuery(
      {
        office_id: office.id,
        status,
        searchQuery: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      },
      { placeholderData: keepPreviousData },
    );
  const result = data as SitesPage | undefined;
  const total = result?.totalCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Back to the last page when this one no longer exists, such as after a
  // site on it is made inactive while inactive sites are hidden.
  useEffect(() => {
    if (result && !isPlaceholderData && page > lastPage) setPage(lastPage);
  }, [result, isPlaceholderData, page, lastPage, setPage]);

  const goToPage = (next: number) => {
    setPage(next);
    scrollIntoViewIfAbove(listRef.current);
  };

  return (
    <div
      ref={listRef}
      className='scroll-mt-4'>
      {counts.total > 0 && (
        <FilterBar className='mb-3'>
          <SearchFilter
            label='Search sites'
            placeholder='Search sites by name, address or city...'
            value={search}
            onChange={setSearch}
          />
          <SelectFilter
            label='Site status'
            value={status}
            onChange={(value) => setStatus(value as SiteStatus)}
            options={STATUS_OPTIONS}
          />
          {isFiltered && (
            <ClearFiltersButton
              onClick={() => {
                setSearch("");
                setStatus(ALL);
              }}
            />
          )}
        </FilterBar>
      )}

      {isLoading ? (
        <OfficeSitesTableSkeleton />
      ) : !result ? (
        <Error
          variant='inline'
          message={error?.message ?? "The sites could not be loaded."}
        />
      ) : (
        <SitesTable
          sites={result.sites}
          officeId={office.id}
          officeName={office.name}
          canManage={canManage}
          emptyMessage={
            isFiltered
              ? "No sites match these filters"
              : "This office has no sites yet"
          }
          className={cn(
            "transition-opacity",
            isPlaceholderData && "pointer-events-none opacity-60",
          )}
          footer={
            total > 0 && (
              <TablePagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                noun={total === 1 ? "site" : "sites"}
                onPageChange={goToPage}
                className='border-t border-gray-200'
              />
            )
          }
        />
      )}
    </div>
  );
};

export default OfficeSites;

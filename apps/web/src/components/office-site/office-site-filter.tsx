"use client";
import React, { useMemo } from "react";
import { ArrowUpDown, MapPin, MapPinned } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import {
  useOfficeManagementContext,
  type OfficeFilters,
  type OfficeSort,
} from "@/contexts/OfficeManagementContext";

const STATUS_OPTIONS = [
  { label: "All statuses", value: ALL },
  { label: "Active offices", value: "active" },
  { label: "Inactive offices", value: "inactive" },
];

const SITE_STATUS_OPTIONS = [
  { label: "All sites", value: ALL },
  { label: "Active sites", value: "active" },
  { label: "Inactive sites", value: "inactive" },
];

const SORT_OPTIONS = [
  { label: "Name A–Z", value: "asc" },
  { label: "Name Z–A", value: "desc" },
  { label: "Newest first", value: "latest" },
  { label: "Oldest first", value: "oldest" },
];

// The offices and sites page's search, filters and order.
const OfficeSiteFilter = () => {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
    officeNamesOrder,
    setOfficeNamesOrder,
  } = useOfficeManagementContext();

  const officesQuery = trpc.officeQuery.getOfficeOptions.useQuery();

  const stateOptions = useMemo(
    () =>
      [
        ...new Set(
          ((officesQuery.data ?? []) as { state: string }[]).map(
            (office) => office.state,
          ),
        ),
      ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((state) => ({ value: state, label: state })),
    [officesQuery.data],
  );

  const setFilter = (next: Partial<OfficeFilters>) =>
    setFilters({ ...filters, ...next });

  const hasActiveFilters =
    searchQuery !== "" ||
    filters.status !== ALL ||
    filters.state !== ALL ||
    filters.siteStatus !== ALL;

  return (
    <FilterBar className='mb-6'>
      <SearchFilter
        label='Search offices'
        placeholder='Search offices by name, city, state...'
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <SelectFilter
        label='Office status'
        value={filters.status}
        onChange={(status) =>
          setFilter({ status: status as OfficeFilters["status"] })
        }
        options={STATUS_OPTIONS}
      />
      <ComboboxFilter
        label='State'
        allLabel='All states'
        Icon={MapPin}
        value={filters.state}
        onChange={(state) => setFilter({ state })}
        options={stateOptions}
        isLoading={officesQuery.isLoading}
        searchPlaceholder='Search states...'
      />
      <SelectFilter
        label='Sites shown'
        Icon={MapPinned}
        value={filters.siteStatus}
        onChange={(siteStatus) =>
          setFilter({ siteStatus: siteStatus as OfficeFilters["siteStatus"] })
        }
        options={SITE_STATUS_OPTIONS}
      />
      <SelectFilter
        label='Sort offices'
        Icon={ArrowUpDown}
        value={officeNamesOrder}
        onChange={(value) => setOfficeNamesOrder(value as OfficeSort)}
        options={SORT_OPTIONS}
        defaultValue={null}
      />
      {hasActiveFilters && <ClearFiltersButton onClick={resetFilters} />}
    </FilterBar>
  );
};

export default OfficeSiteFilter;

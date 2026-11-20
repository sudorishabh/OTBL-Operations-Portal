"use client";
import React from "react";
import { AlertTriangle, ArrowUpDown, HardHat, Layers } from "lucide-react";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
  type FilterOption,
} from "@/components/filters/list-filters";
import StartEndDateFilter from "@/components/filters/start-end-date-filter";
import {
  EXPENSE_SORT_OPTIONS,
  NONE,
  NO_EXPENSE_FILTERS,
  type ExpenseListFilters,
  type ExpenseSort,
} from "./expense-list-filters";

interface Props {
  filters: ExpenseListFilters;
  onChange: (filters: ExpenseListFilters) => void;
  sort: ExpenseSort;
  onSortChange: (sort: ExpenseSort) => void;
  vendors: FilterOption[];
  hasNoVendor: boolean;
  /** Left out where there is one activity, as under bioremediation. */
  activities?: FilterOption[];
  hasExceeded: boolean;
  isFiltered: boolean;
}

// The search, filters and order of a site's expenses.
const ExpenseFilterBar = ({
  filters,
  onChange,
  sort,
  onSortChange,
  vendors,
  hasNoVendor,
  activities,
  hasExceeded,
  isFiltered,
}: Props) => {
  const set =
    <K extends keyof ExpenseListFilters>(key: K) =>
    (value: ExpenseListFilters[K]) =>
      onChange({ ...filters, [key]: value });

  return (
    <FilterBar>
      <SearchFilter
        label='Search expenses'
        placeholder='Search by description, invoice or vendor'
        value={filters.search}
        onChange={set("search")}
      />
      <ComboboxFilter
        label='Vendor'
        allLabel='All vendors'
        Icon={HardHat}
        value={filters.vendor}
        onChange={set("vendor")}
        options={vendors}
        pinnedOptions={hasNoVendor ? [{ value: NONE, label: "No vendor" }] : []}
        searchPlaceholder='Search vendors'
      />
      {/* The days an expense may start on. */}
      <StartEndDateFilter
        from={filters.from}
        to={filters.to}
        onChange={(from, to) => onChange({ ...filters, from, to })}
      />
      {activities && activities.length > 0 && (
        <SelectFilter
          label='Activity'
          Icon={Layers}
          value={filters.activity}
          onChange={set("activity")}
          options={[
            { value: ALL, label: "All activities" },
            ...activities,
            { value: NONE, label: "Other / Unlinked" },
          ]}
        />
      )}
      {(hasExceeded || filters.exceeded !== ALL) && (
        <SelectFilter
          label='Estimate'
          Icon={AlertTriangle}
          value={filters.exceeded}
          onChange={set("exceeded")}
          options={[
            { value: ALL, label: "Within or over the estimate" },
            { value: "exceeded", label: "Over the estimate" },
          ]}
        />
      )}
      <SelectFilter
        label='Order expenses'
        Icon={ArrowUpDown}
        value={sort}
        onChange={(value) => onSortChange(value as ExpenseSort)}
        options={EXPENSE_SORT_OPTIONS}
        defaultValue={null}
      />
      {/* Clearing the filters keeps the chosen order. */}
      {isFiltered && (
        <ClearFiltersButton onClick={() => onChange(NO_EXPENSE_FILTERS)} />
      )}
    </FilterBar>
  );
};

export default ExpenseFilterBar;

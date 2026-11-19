"use client";
import React from "react";
import {
  ArrowUpDown,
  FileCheck2,
  HardHat,
  MapPin,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
  type FilterOption,
} from "@/components/filters/list-filters";
import DateRangeFilter from "@/components/filters/date-range-filter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NO_ORDER_FILTERS,
  ORDER_SORT_OPTIONS,
  type OrderFilters,
  type OrderSort,
  type OrderType,
} from "./contract-order-filters";

const TYPES: { value: OrderType; label: string; Icon?: React.ElementType }[] = [
  { value: ALL, label: "All" },
  { value: "purchase_order", label: "Purchase orders", Icon: ShoppingCart },
  { value: "sub_contract", label: "Sub-contracts", Icon: Wrench },
];

const COMPLETION_OPTIONS: FilterOption[] = [
  { value: ALL, label: "Any status" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Not completed" },
];

interface Props {
  filters: OrderFilters;
  onChange: (filters: OrderFilters) => void;
  sort: OrderSort;
  onSortChange: (sort: OrderSort) => void;
  /** How many orders of each type the other filters leave. */
  counts: Record<OrderType, number>;
  sites: FilterOption[];
  vendors: FilterOption[];
  isFiltered: boolean;
}

// One line over a work order's orders: type tabs with how many each holds
// on the left; search, site, vendor, completion, dates and order on the
// right. Wraps on narrow screens.
const ContractOrderFilterBar = ({
  filters,
  onChange,
  sort,
  onSortChange,
  counts,
  sites,
  vendors,
  isFiltered,
}: Props) => {
  const set =
    <K extends keyof OrderFilters>(key: K) =>
    (value: OrderFilters[K]) =>
      onChange({ ...filters, [key]: value });

  return (
    <div className='mb-3 flex flex-wrap items-center gap-2'>
      <Tabs
        value={filters.type}
        onValueChange={(value) => set("type")(value as OrderType)}
        className='min-w-0 max-w-full'>
        <TabsList className='h-8 max-w-full overflow-x-auto'>
          {TYPES.map(({ value, label, Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className='gap-1.5 px-2.5 text-xs text-gray-800'>
              {Icon && <Icon className='size-3.5 text-gray-500' />}
              {label}
              <span className='tabular-nums text-gray-400'>
                {counts[value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FilterBar className='w-full sm:ml-auto sm:w-auto sm:justify-end'>
        <SearchFilter
          label='Search orders'
          placeholder='Search code, vendor or site'
          value={filters.search}
          onChange={set("search")}
          className='sm:w-56'
        />
        {/* Only worth picking from when there's more than one. */}
        {sites.length > 1 && (
          <ComboboxFilter
            label='Site'
            allLabel='All sites'
            Icon={MapPin}
            value={filters.site}
            onChange={set("site")}
            options={sites}
            searchPlaceholder='Search sites'
            className='sm:max-w-44'
          />
        )}
        {vendors.length > 1 && (
          <ComboboxFilter
            label='Vendor'
            allLabel='All vendors'
            Icon={HardHat}
            value={filters.vendor}
            onChange={set("vendor")}
            options={vendors}
            searchPlaceholder='Search vendors'
            className='sm:max-w-44'
          />
        )}
        <SelectFilter
          label='Completion'
          Icon={FileCheck2}
          value={filters.completion}
          onChange={(value) =>
            set("completion")(value as OrderFilters["completion"])
          }
          options={COMPLETION_OPTIONS}
        />
        <DateRangeFilter
          label='Dated'
          from={filters.from}
          to={filters.to}
          onChange={(from, to) => onChange({ ...filters, from, to })}
        />
        <SelectFilter
          label='Order by date'
          Icon={ArrowUpDown}
          value={sort}
          onChange={(value) => onSortChange(value as OrderSort)}
          options={ORDER_SORT_OPTIONS}
          defaultValue={null}
        />
        {/* Clearing keeps the type tab and the order. */}
        {isFiltered && (
          <ClearFiltersButton
            onClick={() =>
              onChange({ ...NO_ORDER_FILTERS, type: filters.type })
            }
          />
        )}
      </FilterBar>
    </div>
  );
};

export default ContractOrderFilterBar;

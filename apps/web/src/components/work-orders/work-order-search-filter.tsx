"use client";
import React, { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { ArrowUpDown, Building2, FlaskConical, Landmark } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import {
  useWorkOrderManagementContext,
  type WorkOrderFilters,
  type WorkOrderProcess,
  type WorkOrderSort,
} from "@/contexts/WorkOrderManagementContext";

type OfficeOption = { id: number; name: string; city: string; state: string };
type ClientOption = {
  id: number;
  name: string;
  city: string;
  parent_client_name: string | null;
};

const STATUS_OPTIONS = [
  { label: "All statuses", value: ALL },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const PROCESS_OPTIONS = [
  { label: "All processes", value: ALL },
  { label: "Bioremediation", value: "bioremediation" },
  { label: "Restoration", value: "restoration" },
  {
    label: "Bioremediation + restoration",
    value: "bioremediation_restoration",
  },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "latest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Ending soonest", value: "ending_soonest" },
];

const idValue = (id: number | undefined) => (id ? String(id) : ALL);

const toClientOption = (client: ClientOption) => ({
  value: String(client.id),
  label: client.name,
  hint: [client.parent_client_name, client.city].filter(Boolean).join(" · "),
});
const idFilter = (value: string) => (value === ALL ? undefined : Number(value));

// The work orders list's search, filters and order.
const WorkOrderSearchNFilter = () => {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    resetFilters,
    workOrderOrder,
    setWorkOrderOrder,
  } = useWorkOrderManagementContext();

  const officesQuery = trpc.officeQuery.getOfficeOptions.useQuery();
  // Clients are many, so the picker searches them on the server, a few at a
  // time, keeping the one picked.
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch.trim(), 300);
  const clientsQuery = trpc.clientQuery.findClientOptions.useQuery(
    {
      search: debouncedClientSearch || undefined,
      selected_id: filters.client_id,
    },
    { placeholderData: keepPreviousData },
  );

  const officeOptions = ((officesQuery.data ?? []) as OfficeOption[]).map(
    (office) => ({
      value: String(office.id),
      label: office.name,
      hint: [office.city, office.state].filter(Boolean).join(", "),
    }),
  );
  const clientOptions = (
    (clientsQuery.data?.clients ?? []) as ClientOption[]
  ).map(toClientOption);
  const selectedClient = clientsQuery.data?.selected
    ? toClientOption(clientsQuery.data.selected as ClientOption)
    : undefined;

  const setFilter = (next: Partial<WorkOrderFilters>) =>
    setFilters({ ...filters, ...next });

  const hasActiveFilters =
    searchQuery !== "" ||
    filters.status !== ALL ||
    filters.office_id !== undefined ||
    filters.client_id !== undefined ||
    filters.process_type !== undefined;

  return (
    <FilterBar>
      <SearchFilter
        label='Search work orders'
        placeholder='Search by code, purchase order, agreement, client...'
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <SelectFilter
        label='Status'
        value={filters.status}
        onChange={(status) => setFilter({ status })}
        options={STATUS_OPTIONS}
      />
      <ComboboxFilter
        label='Office'
        allLabel='All offices'
        Icon={Landmark}
        value={idValue(filters.office_id)}
        onChange={(value) => setFilter({ office_id: idFilter(value) })}
        options={officeOptions}
        isLoading={officesQuery.isLoading}
        searchPlaceholder='Search offices, cities...'
      />
      <ComboboxFilter
        label='Client'
        allLabel='All clients'
        Icon={Building2}
        value={idValue(filters.client_id)}
        onChange={(value) => setFilter({ client_id: idFilter(value) })}
        options={clientOptions}
        isLoading={clientsQuery.isLoading}
        searchPlaceholder='Search clients, main clients, cities...'
        onSearchChange={setClientSearch}
        selectedOption={selectedClient}
        hasMore={!!clientsQuery.data?.has_more}
      />
      <SelectFilter
        label='Process'
        Icon={FlaskConical}
        value={filters.process_type ?? ALL}
        onChange={(value) =>
          setFilter({
            process_type:
              value === ALL ? undefined : (value as WorkOrderProcess),
          })
        }
        options={PROCESS_OPTIONS}
      />
      <SelectFilter
        label='Sort work orders'
        Icon={ArrowUpDown}
        value={workOrderOrder}
        onChange={(value) => setWorkOrderOrder(value as WorkOrderSort)}
        options={SORT_OPTIONS}
        defaultValue={null}
      />
      {hasActiveFilters && <ClearFiltersButton onClick={resetFilters} />}
    </FilterBar>
  );
};

export default WorkOrderSearchNFilter;

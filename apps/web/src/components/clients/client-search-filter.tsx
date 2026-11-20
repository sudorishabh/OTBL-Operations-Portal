"use client";
import React from "react";
import { ArrowUpDown, MapPin, Network } from "lucide-react";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import {
  useClientManagementContext,
  type ClientFilters,
} from "@/contexts/ClientManagementContext";
import { trpc } from "@/lib/trpc";

const STATUS_OPTIONS = [
  { label: "All statuses", value: ALL },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const CLIENT_SORT_OPTIONS = [
  { label: "Name A–Z", value: "name_asc" },
  { label: "Name Z–A", value: "name_desc" },
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
];

// The clients list's search, filters and order.
const ClientSearchFilter = () => {
  const {
    clientSearchQuery,
    setClientSearchQuery,
    clientFilters,
    setClientFilters,
    resetClientFilters,
  } = useClientManagementContext();

  const parentClientsQuery = trpc.clientQuery.getParentClients.useQuery();
  const statesQuery = trpc.clientQuery.getClientStates.useQuery();

  const parentClientOptions = (
    (parentClientsQuery.data ?? []) as { id: number; name: string }[]
  ).map((parent) => ({ value: String(parent.id), label: parent.name }));

  const stateOptions = ((statesQuery.data ?? []) as string[]).map((state) => ({
    value: state,
    label: state,
  }));

  const setFilter = (next: Partial<ClientFilters>) =>
    setClientFilters({ ...clientFilters, ...next });

  const hasActiveFilters =
    clientSearchQuery !== "" ||
    clientFilters.status !== ALL ||
    clientFilters.parentClientId !== ALL ||
    clientFilters.state !== ALL;

  return (
    <FilterBar>
      <SearchFilter
        label='Search clients'
        placeholder='Search clients by code, name, GST, email, city...'
        value={clientSearchQuery}
        onChange={setClientSearchQuery}
      />
      <SelectFilter
        label='Status'
        value={clientFilters.status}
        onChange={(status) =>
          setFilter({ status: status as ClientFilters["status"] })
        }
        options={STATUS_OPTIONS}
      />
      <ComboboxFilter
        label='Main client'
        allLabel='All main clients'
        Icon={Network}
        value={clientFilters.parentClientId}
        onChange={(parentClientId) => setFilter({ parentClientId })}
        options={parentClientOptions}
        pinnedOptions={[{ value: "none", label: "No main client" }]}
        isLoading={parentClientsQuery.isLoading}
        searchPlaceholder='Search main clients...'
      />
      <ComboboxFilter
        label='State'
        allLabel='All states'
        Icon={MapPin}
        value={clientFilters.state}
        onChange={(state) => setFilter({ state })}
        options={stateOptions}
        isLoading={statesQuery.isLoading}
        searchPlaceholder='Search states...'
      />
      <SelectFilter
        label='Sort clients'
        Icon={ArrowUpDown}
        value={clientFilters.sort}
        onChange={(sort) => setFilter({ sort: sort as ClientFilters["sort"] })}
        options={CLIENT_SORT_OPTIONS}
        defaultValue={null}
      />
      {hasActiveFilters && <ClearFiltersButton onClick={resetClientFilters} />}
    </FilterBar>
  );
};

export default ClientSearchFilter;

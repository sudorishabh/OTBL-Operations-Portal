"use client";
import React, { useMemo } from "react";
import {
  ArrowUpDown,
  Building2,
  MapPin,
  Network,
  UserPlus,
} from "lucide-react";
import Btn from "@/components/shared/btn";
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
  type ContactFilters,
} from "@/contexts/ClientManagementContext";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";

interface Props {
  type: "clients" | "contacts";
}

type ClientOption = {
  id: number;
  name: string;
  city: string;
  state: string;
  parent_client_name: string | null;
};

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

const CONTACT_SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Name A–Z", value: "name_asc" },
  { label: "Name Z–A", value: "name_desc" },
];

// The search, filters and order of the clients page's two tabs.
const ClientSearchFilter = ({ type }: Props) => {
  const { setParam } = useHandleParams();
  const {
    clientSearchQuery,
    setClientSearchQuery,
    clientFilters,
    setClientFilters,
    resetClientFilters,
    contactSearchQuery,
    setContactSearchQuery,
    contactFilters,
    setContactFilters,
    resetContactFilters,
  } = useClientManagementContext();

  const isClientsTab = type === "clients";

  const parentClientsQuery = trpc.clientQuery.getParentClients.useQuery(
    undefined,
    { enabled: isClientsTab },
  );
  const clientOptionsQuery = trpc.clientQuery.getClientOptions.useQuery();
  const clientOptions = (clientOptionsQuery.data ?? []) as ClientOption[];

  const parentClientOptions = (
    (parentClientsQuery.data ?? []) as { id: number; name: string }[]
  ).map((parent) => ({ value: String(parent.id), label: parent.name }));

  const stateOptions = useMemo(
    () =>
      [...new Set(clientOptions.map((client) => client.state))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map((state) => ({ value: state, label: state })),
    [clientOptions],
  );

  const contactClientOptions = useMemo(
    () =>
      clientOptions.map((client) => ({
        value: String(client.id),
        label: client.name,
        hint: [client.parent_client_name, client.city]
          .filter(Boolean)
          .join(" · "),
      })),
    [clientOptions],
  );

  if (isClientsTab) {
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
          placeholder='Search clients, GST, email, city...'
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
          isLoading={clientOptionsQuery.isLoading}
          searchPlaceholder='Search states...'
        />
        <SelectFilter
          label='Sort clients'
          Icon={ArrowUpDown}
          value={clientFilters.sort}
          onChange={(sort) =>
            setFilter({ sort: sort as ClientFilters["sort"] })
          }
          options={CLIENT_SORT_OPTIONS}
          defaultValue={null}
        />
        {hasActiveFilters && (
          <ClearFiltersButton onClick={resetClientFilters} />
        )}
      </FilterBar>
    );
  }

  const setFilter = (next: Partial<ContactFilters>) =>
    setContactFilters({ ...contactFilters, ...next });

  const hasActiveFilters =
    contactSearchQuery !== "" || contactFilters.clientId !== ALL;

  return (
    <FilterBar>
      <SearchFilter
        label='Search contacts'
        placeholder='Search by name, client, email, phone...'
        value={contactSearchQuery}
        onChange={setContactSearchQuery}
      />
      <ComboboxFilter
        label='Client'
        allLabel='All clients'
        Icon={Building2}
        value={contactFilters.clientId}
        onChange={(clientId) => setFilter({ clientId })}
        options={contactClientOptions}
        isLoading={clientOptionsQuery.isLoading}
        searchPlaceholder='Search clients, main clients, cities...'
      />
      <SelectFilter
        label='Sort contacts'
        Icon={ArrowUpDown}
        value={contactFilters.sort}
        onChange={(sort) => setFilter({ sort: sort as ContactFilters["sort"] })}
        options={CONTACT_SORT_OPTIONS}
        defaultValue={null}
      />
      {hasActiveFilters && <ClearFiltersButton onClick={resetContactFilters} />}
      <Btn
        text='Add Contact'
        onClick={() => setParam("dialog", "create-client-contact")}
        variant='primary'
        Icon={UserPlus}
        className='h-8 text-xs sm:ml-auto'
        disableForViewer
      />
    </FilterBar>
  );
};

export default ClientSearchFilter;

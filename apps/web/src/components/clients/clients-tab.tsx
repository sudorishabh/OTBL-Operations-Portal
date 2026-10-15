import { useClientManagementContext } from "@/contexts/ClientManagementContext";
import { trpc } from "@/lib/trpc";
import React from "react";
import ClientCard from "./client-card";
import ParentClientGroup from "./parent-client-group";
import NoFetchData from "@/components/shared/no-fetch-data";
import { Webhook } from "lucide-react";
import ClientsSkeleton from "../skeleton/clients/clients-skeleton";
import Error from "@/components/shared/error";
interface ClientContact {
  id: number;
  client_id: number;
  name: string;
  designation?: string;
  contact_number: string;
  email: string;
  contact_type?: string;
}

interface Client {
  id: number;
  parent_client_id: number | null;
  parent_client_name: string | null;
  name: string;
  email: string;
  contact_number: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  status?: string;
  created_at?: string | Date;
  contacts_count?: number;
  work_order_number?: number;
  proposal_number?: number;
  sites_work_done?: number;
}

interface ClientContactsTableProps {
  contacts: ClientContact[];
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  } | null;
  handleLoadMore: () => void;
  isLoadingData: boolean;
}

interface Props {
  tab: string;
}

type ParentClient = { id: number; name: string };

type ClientGroup = { parentClient: ParentClient; branches: Client[] };

// Branches sit under their main client; clients without one stay standalone.
const groupClients = (
  clients: Client[],
  parentClients: ParentClient[],
  showEmptyGroups: boolean,
) => {
  const groups = new Map<number, ClientGroup>(
    parentClients.map((parentClient) => [
      parentClient.id,
      { parentClient, branches: [] },
    ]),
  );
  const standalone: Client[] = [];

  for (const client of clients) {
    if (!client.parent_client_id) {
      standalone.push(client);
      continue;
    }

    let group = groups.get(client.parent_client_id);
    if (!group) {
      // Main client list not refreshed yet; fall back to the joined name.
      group = {
        parentClient: {
          id: client.parent_client_id,
          name: client.parent_client_name ?? "",
        },
        branches: [],
      };
      groups.set(client.parent_client_id, group);
    }
    group.branches.push(client);
  }

  return {
    groups: [...groups.values()]
      .filter((group) => showEmptyGroups || group.branches.length > 0)
      .sort((a, b) => a.parentClient.name.localeCompare(b.parentClient.name)),
    standalone,
  };
};

const ClientsTab = ({ tab }: Props) => {
  const isClientTab = tab === "clients";

  const { clientSearchQuery, clientFilters } = useClientManagementContext();

  const {
    data: clients,
    isLoading,
    isError,
    error,
  } = trpc.clientQuery.getClients.useQuery(
    {
      searchQuery: clientSearchQuery || undefined,
      status: clientFilters.status,
    },
    {
      enabled: isClientTab,
    },
  );

  const { data: parentClients, isLoading: isParentClientsLoading } =
    trpc.clientQuery.getParentClients.useQuery(undefined, {
      enabled: isClientTab,
    });

  if (isLoading || isParentClientsLoading) {
    return <ClientsSkeleton />;
  }

  if (isError) {
    return (
      <Error
        variant='default'
        message={error.message}
      />
    );
  }

  // While searching or filtering, only show main clients with matching branches.
  const hasActiveFilters =
    clientSearchQuery.trim() !== "" || clientFilters.status !== "all";

  const { groups, standalone } = groupClients(
    (clients ?? []) as Client[],
    (parentClients ?? []) as ParentClient[],
    !hasActiveFilters,
  );

  if (groups.length === 0 && standalone.length === 0) {
    return (
      <NoFetchData
        Icon={Webhook}
        title='No Clients Found'
        description='Add clients to manage them'
      />
    );
  }

  const renderClientCard = (client: Client) => (
    <ClientCard
      key={client.id}
      client={client}
      contactsCount={client.contacts_count ?? 0}
    />
  );

  return (
    <div className='space-y-4'>
      {groups.map(({ parentClient, branches }) => (
        <ParentClientGroup
          key={parentClient.id}
          parentClient={parentClient}
          branches={branches}
        />
      ))}

      {standalone.length > 0 && (
        <div className='space-y-3'>
          {groups.length > 0 && (
            <h3 className='pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400'>
              Standalone clients
            </h3>
          )}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4'>
            {standalone.map(renderClientCard)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsTab;

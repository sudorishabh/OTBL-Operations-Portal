import { useClientManagementContext } from "@/contexts/ClientManagementContext";
import { trpc } from "@/lib/trpc";
import React from "react";
import ClientCard from "./client-card";
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

  if (isLoading) {
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

  const hasClients = clients && clients.length > 0;

  if (!hasClients) {
    return (
      <NoFetchData
        Icon={Webhook}
        title='No Clients Found'
        description='Add clients to manage them'
      />
    );
  }

  return (
    <div
      className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1
     gap-4'>
      {clients?.map((client: Client) => (
        <ClientCard
          key={client.id}
          client={client}
          contactsCount={client.contacts_count ?? 0}
        />
      ))}
    </div>
  );
};

export default ClientsTab;

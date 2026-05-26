import Btn from "@/components/shared/btn";
import Input from "@/components/shared/input";
import { useClientManagementContext } from "@/contexts/ClientManagementContext";
import { Search, X, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

interface Props {
  type: "clients" | "contacts";
  clients?: Array<{ id: number; name: string }>;
  isLoading?: boolean;
}

const ClientSearchFilter = ({
  type,
  clients = [],
  isLoading = false,
}: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const searchQuery = isClientsTab ? clientSearchQuery : contactSearchQuery;
  const setSearchQuery = isClientsTab
    ? setClientSearchQuery
    : setContactSearchQuery;

  const hasActiveFilters = isClientsTab
    ? clientSearchQuery !== "" || clientFilters.status !== "all"
    : contactSearchQuery !== "" || contactFilters.clientId !== "all";

  const resetFilters = isClientsTab ? resetClientFilters : resetContactFilters;

  const handleAddContact = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dialog", "create-client-contact");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
      <div className='w-full sm:w-80'>
        <Input
          mode='standalone'
          type='text'
          isWhiteBg={true}
          placeholder={
            isClientsTab
              ? "Search clients by name, email, GST, city..."
              : "Search contacts by name, email, phone..."
          }
          value={searchQuery}
          onChange={setSearchQuery}
          inputIcon={Search}
          className='h-8'
          disabled={isLoading}
        />
      </div>
      <div className='flex flex-wrap items-center gap-2 sm:gap-3 text-xs'>
        {/* Filter - Status for Clients, Client for Contacts */}
        {isClientsTab ? (
          <Input
            mode='standalone'
            isSelect
            isWhiteBg={true}
            selectOptions={[
              { label: "All Status", value: "all" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]}
            placeholder='All Status'
            value={clientFilters.status}
            onChange={(value) =>
              setClientFilters({
                ...clientFilters,
                status: value as "all" | "active" | "inactive",
              })
            }
            className='h-8! w-[140px] text-xs'
            disabled={isLoading}
          />
        ) : (
          <Input
            mode='standalone'
            isSelect
            selectOptions={[
              { label: "All Clients", value: "all" },
              ...clients.map((client) => ({
                label: client.name,
                value: client.id.toString(),
              })),
            ]}
            placeholder='All Clients'
            value={contactFilters.clientId}
            onChange={(value) =>
              setContactFilters({ ...contactFilters, clientId: value })
            }
            className='h-8! w-[180px] text-xs'
            disabled={isLoading}
          />
        )}

        {/* Reset Button */}
        {hasActiveFilters && (
          <Btn
            text='Reset'
            onClick={resetFilters}
            variant='outline'
            Icon={X}
            className='h-8 text-xs'
          />
        )}

        {/* Add Contact Button - Only for Contacts Tab */}
        {!isClientsTab && (
          <Btn
            text='Add Contact'
            onClick={handleAddContact}
            variant='primary'
            Icon={UserPlus}
            className='h-8 text-xs'
          />
        )}
      </div>
    </div>
  );
};

export default ClientSearchFilter;

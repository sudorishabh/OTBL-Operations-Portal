import { useClientManagementContext } from "@/contexts/ClientManagementContext";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import { useDebounce } from "@/hooks/useDebounce";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import PaginationSummary from "@/components/shared/pagination-summary";
import ClientCard from "./client-card";
import ParentClientGroup from "./parent-client-group";
import NoFetchData from "@/components/shared/no-fetch-data";
import { Webhook } from "lucide-react";
import ClientsSkeleton from "../skeleton/clients/clients-skeleton";
import Error from "@/components/shared/error";

// A page holds this many main clients (each with all its branches) and
// clients without a main client.
const CLIENTS_PAGE_SIZE = 10;

type ClientGroupsPage = RouterOutputs["clientQuery"]["getClientGroups"];

interface Props {
  tab: string;
}

const ClientsTab = ({ tab }: Props) => {
  const isClientTab = tab === "clients";

  const { clientSearchQuery, clientFilters } = useClientManagementContext();

  const debouncedSearch = useDebounce(clientSearchQuery.trim(), 300);
  const { status, parentClientId, state, sort } = clientFilters;
  const isFiltered =
    !!debouncedSearch ||
    status !== "all" ||
    parentClientId !== "all" ||
    state !== "all";

  const queryInput = {
    limit: CLIENTS_PAGE_SIZE,
    searchQuery: debouncedSearch || undefined,
    status,
    parentClientId:
      parentClientId === "all"
        ? undefined
        : parentClientId === "none"
          ? ("none" as const)
          : Number(parentClientId),
    state: state === "all" ? undefined : state,
    sort,
  };

  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<ClientGroupsPage>[] = trpc.useQueries(
    (t: any) =>
      pages.map((page) =>
        t.clientQuery.getClientGroups(
          { ...queryInput, page },
          { enabled: isClientTab },
        ),
      ),
  );

  const loadedPages = pageQueries.flatMap((query) => query.data ?? []);
  const lastLoadedPage = loadedPages.at(-1);
  const groups = loadedPages.flatMap((page) => page.groups);
  const standalone = loadedPages.flatMap((page) => page.standalone);
  const failedQuery = pageQueries.find((query) => query.isError);
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;

  if (pageQueries[0]?.isLoading) {
    return <ClientsSkeleton />;
  }

  if (failedQuery?.error) {
    return (
      <Error
        variant='default'
        message={failedQuery.error.message}
      />
    );
  }

  if (groups.length === 0 && standalone.length === 0) {
    return (
      <NoFetchData
        Icon={Webhook}
        title={isFiltered ? "No matching clients" : "No Clients Found"}
        description={
          isFiltered
            ? "Try another search or clear the filters."
            : "Add clients to manage them"
        }
      />
    );
  }

  const shownClients = groups.reduce(
    (sum, group) => sum + group.branches.length,
    standalone.length,
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
            <h3 className='pt-3 text-sm font-medium text-gray-500'>
              Clients without a main client
              <span className='ml-1.5 tabular-nums text-gray-400'>
                {lastLoadedPage?.totalStandalone ?? standalone.length}
              </span>
            </h3>
          )}
          <div className='space-y-3'>
            {standalone.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
              />
            ))}
          </div>
        </div>
      )}

      {lastLoadedPage?.pagination.hasMore && (
        <LoadMoreBtn
          onClick={loadMore}
          loading={isFetchingMore}
        />
      )}

      <PaginationSummary
        shown={shownClients}
        total={lastLoadedPage?.totalClients}
        page={lastLoadedPage?.pagination.page}
        totalPages={lastLoadedPage?.pagination.totalPages}
        noun='clients'
        className='rounded-lg border bg-white'
      />
    </div>
  );
};

export default ClientsTab;

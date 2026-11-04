import React, { useMemo } from "react";
import { ChevronDown, FileStack, Plus } from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { type proposalTypes } from "@pkg/schema";
import CustomButton from "@/components/shared/btn";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useHandleParams } from "@/hooks/useHandleParams";
import { useIsAdmin } from "@/contexts/AuthContext";
import ClientProposalSkeleton from "@/components/skeleton/client/client-proposal-skeleton";
import ProcessSectionHeader from "@/components/work-order/process-section-header";
import CreateWODialog from "../create-wo/create-wo-dialog";
import CreateProposalDialog from "./create-proposal-dialog";
import ProposalDetailDialog from "./proposal-detail-dialog";
import ProposalWOFilters from "./proposal-wo-filters";
import ProposalWOList from "./proposal-wo-list";
import {
  useProposalFilters,
  type WorkOrderFilter,
} from "./use-proposal-filters";

interface Props {
  clientId: string;
}

// One page from getProposalsByClient. The app's tRPC client is untyped, so
// this spells out what the server sends.
type ProposalsPage = {
  proposals: proposalTypes.getProposalsByClientReturnType[];
  counts: Record<WorkOrderFilter, number>;
  pagination: { page: number; total: number; hasMore: boolean };
};

const NO_COUNTS: Record<WorkOrderFilter, number> = {
  all: 0,
  none: 0,
  pending: 0,
  completed: 0,
  cancelled: 0,
};

const plural = (count: number) => (count === 1 ? "proposal" : "proposals");

const ProposalWOMain = ({ clientId }: Props) => {
  const { setParam, getParam } = useHandleParams();
  const isAdmin = useIsAdmin();
  const { filters, query, setFilter, reset, isFiltered } = useProposalFilters();

  // Fifty at a time, filtered on the server. Rows already listed stay put
  // while a filter change loads.
  const {
    data,
    isLoading,
    isPlaceholderData: isRefiltering,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.proposalQuery.getProposalsByClient.useInfiniteQuery(
    { client_id: Number(clientId), ...query },
    {
      enabled: !!clientId,
      initialCursor: 1,
      getNextPageParam: ({ pagination }: ProposalsPage) =>
        pagination.hasMore ? pagination.page + 1 : undefined,
      placeholderData: keepPreviousData,
    },
  );

  const pages: ProposalsPage[] | undefined = data?.pages;
  const rows = useMemo(
    () => pages?.flatMap((page) => page.proposals) ?? [],
    [pages],
  );

  if (isLoading) {
    return <ClientProposalSkeleton />;
  }

  const firstPage = pages?.[0];
  const counts = firstPage?.counts ?? NO_COUNTS;
  const total = firstPage?.pagination.total ?? 0;
  const hasProposals = isFiltered || counts.all > 0;

  const proposalId = getParam("proposal-id");
  const selectedProposal = rows.find(
    (row) => row.proposal.id === (proposalId ? Number(proposalId) : null),
  );
  const proposalTitle = selectedProposal?.proposal.title || "";

  return (
    <>
      <section className='rounded-lg border bg-white p-6'>
        <ProcessSectionHeader
          Icon={FileStack}
          title='Proposals and work orders'
          description={
            !hasProposals
              ? "Each proposal beside the work order made from it"
              : isFiltered
                ? `${total} matching ${plural(total)}`
                : `${total} ${plural(total)}, each beside the work order made from it`
          }>
          {isAdmin && (
            <CustomButton
              text='Create Proposal'
              variant='outline'
              Icon={Plus}
              onClick={() => setParam("dialog", "create-proposal")}
            />
          )}
        </ProcessSectionHeader>

        {hasProposals && (
          <ProposalWOFilters
            filters={filters}
            counts={counts}
            setFilter={setFilter}
            isFiltered={isFiltered}
            reset={reset}
          />
        )}

        {rows.length > 0 ? (
          <div
            className={cn(
              "transition-opacity",
              isRefiltering && "pointer-events-none opacity-60",
            )}>
            <ProposalWOList
              rows={rows}
              footer={
                <div className='flex min-h-11 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50/60 px-5 py-2 text-xs text-gray-500'>
                  <span>
                    Showing {rows.length} of {total}
                  </span>
                  {hasNextPage && (
                    <CustomButton
                      text='Load more'
                      variant='outline'
                      Icon={ChevronDown}
                      onClick={() => fetchNextPage()}
                      loading={isFetchingNextPage}
                      className='h-7 text-xs'
                    />
                  )}
                </div>
              }
            />
          </div>
        ) : hasProposals ? (
          <div className='rounded-lg border border-dashed py-8 text-center text-xs text-gray-500'>
            No proposals match these filters.{" "}
            <button
              type='button'
              onClick={reset}
              className='cursor-pointer font-medium text-emerald-700 hover:text-emerald-800'>
              Clear filters
            </button>
          </div>
        ) : (
          <p className='rounded-lg border border-dashed py-8 text-center text-xs text-gray-500'>
            No proposals yet.
            {isAdmin && " Create one to start a work order from it."}
          </p>
        )}
      </section>

      <CreateProposalDialog clientId={Number(clientId)} />
      <CreateWODialog proposalTitle={proposalTitle} />
      <ProposalDetailDialog />
    </>
  );
};

export default ProposalWOMain;

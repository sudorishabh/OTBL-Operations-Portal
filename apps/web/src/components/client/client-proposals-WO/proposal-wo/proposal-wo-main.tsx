import CustomButton from "@/components/shared/btn";
import { FileStack, Plus } from "lucide-react";
import React from "react";
import CreateProposalDialog from "./create-proposal-dialog";
import { trpc } from "@/lib/trpc";
import { useHandleParams } from "@/hooks/useHandleParams";
import CreateWODialog from "../create-wo/create-wo-dialog";
import ClientProposalSkeleton from "@/components/skeleton/client/client-proposal-skeleton";
import ProposalDetailDialog from "./proposal-detail-dialog";
import ProposalWOList from "./proposal-wo-list";
import ProposalWOFilters from "./proposal-wo-filters";
import { useProposalFilters } from "./use-proposal-filters";
import { type proposalTypes } from "@pkg/schema";
import ProcessSectionHeader from "@/components/work-order/process-section-header";
import { useIsAdmin } from "@/contexts/AuthContext";

interface Props {
  clientId: string;
}

// A stable empty list, so the filters don't recompute while loading.
const NO_ROWS: proposalTypes.getProposalsByClientReturnType[] = [];

const ProposalWOMain = ({ clientId }: Props) => {
  const { setParam, getParam } = useHandleParams();
  const isAdmin = useIsAdmin();

  const { data, isLoading } = trpc.proposalQuery.getProposalsByClient.useQuery(
    { client_id: Number(clientId) },
    { enabled: !!clientId },
  );
  const proposals = data?.proposals ?? NO_ROWS;
  const { filters, setFilter, reset, isFiltered, visible, counts } =
    useProposalFilters(proposals);

  if (isLoading) {
    return <ClientProposalSkeleton />;
  }

  const total = proposals.length;

  const proposalId = getParam("proposal-id");
  const selectedProposal = proposals.find(
    (p: any) => p.proposal.id === (proposalId ? Number(proposalId) : null),
  );
  const proposalTitle = selectedProposal?.proposal.title || "";

  return (
    <>
      <section className='rounded-lg border bg-white p-6'>
        <ProcessSectionHeader
          Icon={FileStack}
          title='Proposals and work orders'
          description={
            isFiltered
              ? `Showing ${visible.length} of ${total} proposals`
              : total > 0
                ? `${total} ${total === 1 ? "proposal" : "proposals"}, each beside the work order made from it`
                : "Each proposal beside the work order made from it"
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

        {total > 0 && (
          <ProposalWOFilters
            filters={filters}
            counts={counts}
            setFilter={setFilter}
          />
        )}

        {visible.length > 0 ? (
          <ProposalWOList rows={visible} />
        ) : total > 0 ? (
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

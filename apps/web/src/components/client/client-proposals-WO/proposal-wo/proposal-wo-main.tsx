import CustomButton from "@/components/shared/btn";
import { Check, FileStack, Link2Off, Plus } from "lucide-react";
import React from "react";
import CreateProposalDialog from "./create-proposal-dialog";
import { trpc } from "@/lib/trpc";
import ProposalCard from "./proposal-card";
import { useHandleParams } from "@/hooks/useHandleParams";
import WordOrderCard from "./work-order-card";
import { type proposalTypes } from "@pkg/schema";
import CreateWODialog from "../create-wo/create-wo-dialog";
import ClientProposalSkeleton from "@/components/skeleton/client/client-proposal-skeleton";
import ProposalWODetailsDialog from "./proposal-wo-details-dialog";
import ProposalDetailDialog from "./proposal-detail-dialog";
import ProcessSectionHeader from "@/components/work-order/process-section-header";
import { useIsAdmin } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 6;

interface Props {
  clientId: string;
}

// The dashed link between a proposal and the work order made from it.
const ProposalLink = ({ linked }: { linked: boolean }) => (
  <div className='relative flex items-center justify-center'>
    <div className='w-full border-t border-dashed border-gray-300' />
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 rounded-full bg-white p-1 ring-1",
        linked
          ? "text-emerald-600 ring-emerald-200"
          : "text-gray-400 ring-gray-200",
      )}
      title={linked ? "Linked with a work order" : "No work order yet"}>
      {linked ? (
        <Check className='size-3.5' />
      ) : (
        <Link2Off className='size-3.5' />
      )}
    </div>
  </div>
);

const ProposalWOMain = ({ clientId }: Props) => {
  const { setParam, getParam } = useHandleParams();
  const isAdmin = useIsAdmin();

  const { data, isLoading } = trpc.proposalQuery.getProposalsByClient.useQuery(
    { client_id: Number(clientId), limit: PAGE_SIZE },
    { enabled: !!clientId },
  );

  if (isLoading) {
    return <ClientProposalSkeleton />;
  }

  const proposals = data?.proposals || [];
  const total = data?.total ?? 0;
  const hasMore = total > proposals.length;

  const proposalId = getParam("proposal-id");
  const selectedProposal = proposals.find(
    (p: any) => p.proposal.id === (proposalId ? Number(proposalId) : null),
  );
  const proposalTitle = selectedProposal?.proposal.title || "";
  const openAll = () => setParam("dialog", "proposal-wo");

  return (
    <>
      <section className='rounded-lg border bg-white p-6'>
        <ProcessSectionHeader
          Icon={FileStack}
          title='Proposals and work orders'
          description={
            total > 0
              ? `Each proposal beside its work order · ${
                  hasMore
                    ? `latest ${proposals.length} of ${total}`
                    : `${total} total`
                }`
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
          <CustomButton
            text={total > 0 ? `View all ${total}` : "View all"}
            title='View all proposals and work orders'
            variant='arrow'
            arrowType='upright'
            onClick={openAll}
          />
        </ProcessSectionHeader>

        {proposals.length > 0 ? (
          <div className='space-y-3'>
            {proposals.map(({ workOrder, proposal }: any, index: number) => (
              <div
                key={proposal?.id || index}
                className='grid grid-cols-1 items-stretch gap-y-3 md:grid-cols-[1fr_56px_1fr] md:gap-y-0'>
                <ProposalCard proposal={proposal} />
                <ProposalLink linked={!!workOrder} />
                <WordOrderCard
                  workOrder={
                    workOrder as proposalTypes.getProposalsByClientReturnType["workOrder"]
                  }
                  proposalId={proposal.id}
                  proposalTitle={proposal.title}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className='rounded-lg border border-dashed py-8 text-center text-xs text-gray-500'>
            No proposals yet.
            {isAdmin && " Create one to start a work order from it."}
          </p>
        )}

        {hasMore && (
          <div className='mt-4 flex justify-center'>
            <button
              type='button'
              onClick={openAll}
              className='text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700'>
              View all {total} proposals →
            </button>
          </div>
        )}
      </section>

      <CreateProposalDialog clientId={Number(clientId)} />
      <CreateWODialog proposalTitle={proposalTitle} />
      <ProposalWODetailsDialog clientId={Number(clientId)} />
      <ProposalDetailDialog />
    </>
  );
};

export default ProposalWOMain;

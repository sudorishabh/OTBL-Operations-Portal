import CustomButton from "@/components/shared/btn";
import { ArrowRight, FileStack, Plus } from "lucide-react";
import React from "react";
import CreateProposalDialog from "./create-proposal-dialog";
import { trpc } from "@/lib/trpc";
import ProposalCell from "./proposal-cell";
import { useHandleParams } from "@/hooks/useHandleParams";
import WorkOrderCell from "./work-order-cell";
import { type proposalTypes } from "@pkg/schema";
import CreateWODialog from "../create-wo/create-wo-dialog";
import ClientProposalSkeleton from "@/components/skeleton/client/client-proposal-skeleton";
import ProposalDetailDialog from "./proposal-detail-dialog";
import ProcessSectionHeader from "@/components/work-order/process-section-header";
import { useIsAdmin } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
}

// Proposal on the left, an arrow, then the work order made from it.
const ROW_GRID = "md:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)]";

const ProposalWOMain = ({ clientId }: Props) => {
  const { setParam, getParam } = useHandleParams();
  const isAdmin = useIsAdmin();

  const { data, isLoading } = trpc.proposalQuery.getProposalsByClient.useQuery(
    { client_id: Number(clientId) },
    { enabled: !!clientId },
  );

  if (isLoading) {
    return <ClientProposalSkeleton />;
  }

  const proposals = data?.proposals || [];
  const total = proposals.length;

  const proposalId = getParam("proposal-id");
  const selectedProposal = proposals.find(
    (p: any) => p.proposal.id === (proposalId ? Number(proposalId) : null),
  );
  const proposalTitle = selectedProposal?.proposal.title || "";
  const awaiting = proposals.filter((p: any) => !p.workOrder).length;

  return (
    <>
      <section className='rounded-lg border bg-white p-6'>
        <ProcessSectionHeader
          Icon={FileStack}
          title='Proposals and work orders'
          description={
            total > 0
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

        {proposals.length > 0 ? (
          <div className='overflow-hidden rounded-lg border border-gray-200'>
            <div
              className={cn(
                "hidden gap-2 border-b border-gray-200 bg-gray-50/60 px-2 py-2 text-xs font-medium text-gray-500 md:grid",
                ROW_GRID,
              )}>
              <span className='px-3'>Proposal</span>
              <span />
              <span className='flex items-center justify-between gap-2 px-3'>
                Work order
                {awaiting > 0 && (
                  <span
                    className='font-normal text-amber-600'
                    title='Proposals listed here with no work order yet'>
                    {awaiting} awaiting
                  </span>
                )}
              </span>
            </div>

            <ul className='divide-y divide-gray-100'>
              {proposals.map(({ workOrder, proposal }: any, index: number) => (
                <li
                  key={proposal?.id || index}
                  className={cn(
                    "grid grid-cols-1 items-center gap-1 p-2 md:gap-2",
                    ROW_GRID,
                  )}>
                  <ProposalCell proposal={proposal} />
                  <ArrowRight
                    aria-hidden='true'
                    className={cn(
                      "hidden size-4 justify-self-center md:block",
                      workOrder ? "text-emerald-500" : "text-gray-300",
                    )}
                  />
                  {/* Stacked on small screens, indented under its proposal. */}
                  <div className='ml-3 border-l-2 border-gray-100 pl-1 md:ml-0 md:border-0 md:pl-0'>
                    <WorkOrderCell
                      workOrder={
                        workOrder as proposalTypes.getProposalsByClientReturnType["workOrder"]
                      }
                      proposalId={proposal.id}
                    />
                  </div>
                </li>
              ))}
            </ul>
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

"use client";
import CustomButton from "@/components/shared/btn";
import DialogWindow from "@/components/shared/dialog-window";
import { trpc } from "@/lib/trpc";
import { capitalFirstLetter } from "@pkg/utils";
import { useHandleParams } from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Link,
  XCircle,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import React from "react";
import toast from "react-hot-toast";

const ProposalDetailDialog = () => {
  const { getParam, deleteParams, deleteParam, setParam } = useHandleParams();
  const isOpen = getParam("dialog") === "proposal-detail";
  const proposalId = getParam("proposal-id");
  const isFull = getParam("window") === "full";

  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const { data, isLoading } = trpc.proposalQuery.getProposalById.useQuery(
    { proposal_id: Number(proposalId) },
    { enabled: !!proposalId && isOpen },
  );

  const proposal = data?.proposal;
  const workOrder = data?.workOrder;
  const canManage = data?.canManage ?? false;

  const status = proposal?.status;
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isPending = status === "pending";

  const invalidate = async () => {
    await utils.proposalQuery.getProposalById.invalidate({
      proposal_id: Number(proposalId),
    });
    await utils.proposalQuery.getProposalsByClient.invalidate();
    await utils.proposalQuery.getProposalsByClientPaginated.invalidate();
  };

  const approve = trpc.proposalMutation.approveProposal.useMutation({
    onSuccess: async () => {
      toast.success("Proposal approved");
      await invalidate();
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  const reject = trpc.proposalMutation.rejectProposal.useMutation({
    onSuccess: async () => {
      toast.success("Proposal rejected");
      await invalidate();
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  const decisionBusy = approve.isPending || reject.isPending;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    return format(new Date(date), "dd MMM yyyy");
  };

  return (
    <DialogWindow
      open={isOpen}
      setOpen={() => deleteParams(["dialog", "proposal-id", "window"])}
      size='lg'
      title='Proposal Details'
      description='View complete proposal information'
      isFullScreen={isFull}
      onToggleFullScreen={() =>
        isFull ? deleteParam("window") : setParam("window", "full")
      }>
      {isLoading ? (
        <div className='flex items-center justify-center p-12'>
          <div className='animate-pulse flex flex-col items-center gap-4'>
            <div className='h-12 w-12 bg-gray-200 rounded-full'></div>
            <div className='h-4 w-48 bg-gray-200 rounded'></div>
          </div>
        </div>
      ) : proposal ? (
        <div className='space-y-8 p-1'>
          {/* Proposal Header */}
          <div className='bg-white rounded-xl border border-gray-100 shadow-sm p-6'>
            <div className='flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6'>
              <div>
                <div className='flex items-center gap-3 mb-2'>
                  <span className='px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-xs font-mono font-medium ring-1 ring-sky-200'>
                    {proposal.code}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      isApproved
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : isRejected
                          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    }`}>
                    {isApproved ? (
                      <CheckCircle2 className='w-3.5 h-3.5' />
                    ) : isRejected ? (
                      <XCircle className='w-3.5 h-3.5' />
                    ) : (
                      <Clock className='w-3.5 h-3.5' />
                    )}
                    {capitalFirstLetter(proposal.status)}
                  </span>
                </div>
                <h2 className='text-xl font-bold text-gray-900 leading-tight'>
                  {capitalFirstLetter(proposal.title)}
                </h2>
              </div>

              <div className='flex flex-wrap items-center gap-2 shrink-0'>
                {/* Manager-only decision controls, shown while pending. */}
                {canManage && isPending && (
                  <>
                    <CustomButton
                      variant='primary'
                      text='Approve'
                      Icon={CheckCircle2}
                      loading={approve.isPending}
                      disabled={decisionBusy}
                      onClick={() =>
                        approve.mutate({ proposal_id: Number(proposalId) })
                      }
                    />
                    <CustomButton
                      variant='outline'
                      text='Reject'
                      Icon={XCircle}
                      loading={reject.isPending}
                      disabled={decisionBusy}
                      onClick={() =>
                        reject.mutate({ proposal_id: Number(proposalId) })
                      }
                    />
                  </>
                )}
                {proposal.document_key && (
                  <CustomButton
                    variant='outline'
                    text='View Proposal Document'
                    Icon={FileText}
                    onClick={() => window.open(proposal.document_key, "_blank")}
                  />
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='p-4 rounded-lg bg-gray-50 border border-gray-100'>
                <div className='flex items-center gap-2 text-gray-500 mb-1'>
                  <CalendarDays className='w-4 h-4' />
                  <span className='text-xs font-medium uppercase tracking-wide'>
                    Submitted
                  </span>
                </div>
                <div className='text-lg font-semibold text-gray-900'>
                  {formatDate(proposal.proposal_submission_date)}
                </div>
              </div>

              <div className='p-4 rounded-lg bg-gray-50 border border-gray-100'>
                <div className='flex items-center gap-2 text-gray-500 mb-1'>
                  <Clock className='w-4 h-4' />
                  <span className='text-xs font-medium uppercase tracking-wide'>
                    Created
                  </span>
                </div>
                <div className='text-lg font-semibold text-gray-900'>
                  {formatDate(proposal.created_at)}
                </div>
              </div>
            </div>

            <div className='mt-6'>
              <h3 className='text-sm font-semibold text-gray-900 mb-2'>
                Description
              </h3>
              <p className='text-sm text-gray-600 leading-relaxed whitespace-pre-wrap'>
                {proposal.description || "No description provided."}
              </p>
            </div>
          </div>

          {/* Work Order Section */}
          <div className='bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden'>
            <div className='px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between'>
              <h3 className='font-semibold text-gray-900 flex items-center gap-2'>
                <Briefcase className='w-4 h-4 text-gray-500' />
                Associated Work Order
              </h3>
              {workOrder && (
                <span className='px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100'>
                  {workOrder.code}
                </span>
              )}
            </div>

            <div className='p-6'>
              {workOrder ? (
                <div className='space-y-6'>
                  <div className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
                    <div>
                      <h4 className='text-lg font-semibold text-gray-900 mb-1'>
                        {capitalFirstLetter(workOrder.title)}
                      </h4>
                      <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
                        {workOrder.process_type && (
                          <span className='px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200'>
                            {capitalFirstLetter(
                              workOrder.process_type.replace(/_/g, " "),
                            )}
                          </span>
                        )}
                        <span className='px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200'>
                          Status: {capitalFirstLetter(workOrder.status)}
                        </span>
                      </div>
                    </div>
                    {workOrder.document_key && (
                      <CustomButton
                        variant='outline'
                        text='View WO Document'
                        Icon={ExternalLink}
                        onClick={() =>
                          window.open(workOrder.document_key, "_blank")
                        }
                        className='shrink-0'
                      />
                    )}
                  </div>

                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    <div className='space-y-1'>
                      <p className='text-xs text-gray-500 uppercase'>
                        Agreement No.
                      </p>
                      <p className='text-sm font-medium text-gray-900'>
                        {workOrder.agreement_number}
                      </p>
                    </div>
                    <div className='space-y-1'>
                      <p className='text-xs text-gray-500 uppercase'>
                        RC Number
                      </p>
                      <p className='text-sm font-medium text-gray-900'>
                        {workOrder.rate_contract_number}
                      </p>
                    </div>
                    <div className='space-y-1'>
                      <p className='text-xs text-gray-500 uppercase'>
                        Start Date
                      </p>
                      <p className='text-sm font-medium text-gray-900'>
                        {formatDate(workOrder.start_date)}
                      </p>
                    </div>
                    <div className='space-y-1'>
                      <p className='text-xs text-gray-500 uppercase'>
                        End Date
                      </p>
                      <p className='text-sm font-medium text-gray-900'>
                        {formatDate(workOrder.end_date)}
                      </p>
                    </div>
                  </div>

                  {workOrder.description && (
                    <div>
                      <p className='text-xs text-gray-500 uppercase mb-1'>
                        Description
                      </p>
                      <p className='text-sm text-gray-600'>
                        {workOrder.description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center py-8 text-center'>
                  <div className='w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3'>
                    <Link className='w-5 h-5 text-gray-400' />
                  </div>
                  <p className='text-gray-900 font-medium mb-1'>
                    No Work Order Linked
                  </p>
                  <p className='text-sm text-gray-500 max-w-xs mx-auto'>
                    This proposal does not have an active work order associated
                    with it yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className='flex items-center justify-center h-48 text-gray-500'>
          Order not found
        </div>
      )}
    </DialogWindow>
  );
};

export default ProposalDetailDialog;

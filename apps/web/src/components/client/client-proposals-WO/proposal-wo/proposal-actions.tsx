"use client";
import React, { useState } from "react";
import { CheckCircle2, MoreVertical, Pencil, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { type proposalTypes } from "@pkg/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import { trpc } from "@/lib/trpc";

type Decision = "approve" | "reject";

const DECISIONS: Record<
  Decision,
  {
    verb: string;
    done: string;
    variant: "default" | "destructive";
    button?: string;
  }
> = {
  approve: {
    verb: "Approve",
    done: "Proposal approved",
    variant: "default",
    // The action's variant colours win over plain classes.
    button: "bg-emerald-600! hover:bg-emerald-700!",
  },
  reject: {
    verb: "Reject",
    done: "Proposal rejected",
    variant: "destructive",
  },
};

interface Props {
  proposal: proposalTypes.proposalType;
  // As the row shows it.
  title: string;
}

// An admin's menu on a proposal: approve or reject it while it's pending,
// and edit it. A decision is final, so it's confirmed first.
const ProposalActions = ({ proposal, title }: Props) => {
  // The decision stays set while its confirmation fades out.
  const [decision, setDecision] = useState<Decision>("approve");
  const [isConfirming, setIsConfirming] = useState(false);
  const { setParams } = useHandleParams();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const mutationOptions = (done: string) => ({
    onSuccess: async () => {
      toast.success(done);
      await Promise.all([
        utils.proposalQuery.getProposalsByClient.invalidate(),
        utils.proposalQuery.getProposalById.invalidate({
          proposal_id: proposal.id,
        }),
      ]);
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  });
  const approve = trpc.proposalMutation.approveProposal.useMutation(
    mutationOptions(DECISIONS.approve.done),
  );
  const reject = trpc.proposalMutation.rejectProposal.useMutation(
    mutationOptions(DECISIONS.reject.done),
  );

  const isDeciding = approve.isPending || reject.isPending;
  const isPending = proposal.status === "pending";
  const confirming = DECISIONS[decision];

  const askToConfirm = (next: Decision) => {
    setDecision(next);
    setIsConfirming(true);
  };

  const decide = () => {
    const input = { proposal_id: proposal.id };
    (decision === "approve" ? approve : reject).mutate(input);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            title='More actions'
            aria-label={`More actions for ${title}`}
            className='flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 outline-none transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-700'>
            <MoreVertical className='size-4' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {isPending && (
            <>
              <DropdownMenuItem
                disabled={isDeciding}
                onClick={() => askToConfirm("approve")}>
                <CheckCircle2 className='mr-2 size-4 text-emerald-600' />
                Approve proposal
              </DropdownMenuItem>
              <DropdownMenuItem
                variant='destructive'
                disabled={isDeciding}
                onClick={() => askToConfirm("reject")}>
                <XCircle className='mr-2 size-4' />
                Reject proposal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() =>
              setParams({
                dialog: "edit-proposal",
                "proposal-id": String(proposal.id),
              })
            }>
            <Pencil className='mr-2 size-4' />
            Edit proposal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isConfirming}
        onOpenChange={setIsConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirming.verb} proposal {proposal.code}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {title}. Once {decision === "approve" ? "approved" : "rejected"},
              its status can&apos;t be changed again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={decide}
              variant={confirming.variant}
              className={confirming.button}>
              {confirming.verb}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProposalActions;

import { constants } from "@pkg/utils";

// Labels and colours shared by the proposal rows and their filters.

const { WO_PROCESS } = constants;

// A dot rather than a pill, so the process never reads as a second status.
export const PROCESSES: Record<string, { label: string; dot: string }> = {
  [WO_PROCESS.BIOREMEDIATION]: { label: "Bioremediation", dot: "bg-blue-500" },
  [WO_PROCESS.RESTORATION]: { label: "Restoration", dot: "bg-purple-500" },
  [WO_PROCESS.BIOREMEDIATION_RESTORATION]: {
    label: "Bio + Restoration",
    dot: "bg-orange-500",
  },
};

export type ProposalStatus = "pending" | "approved" | "rejected";

// How each approval status shows on a proposal.
export const PROPOSAL_STATUSES: Record<
  ProposalStatus,
  { label: string; pill: string }
> = {
  pending: {
    label: "Pending",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  approved: {
    label: "Approved",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

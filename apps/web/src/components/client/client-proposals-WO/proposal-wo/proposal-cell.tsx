import React from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { type proposalTypes } from "@pkg/schema";
import { useIsAdmin } from "@/contexts/AuthContext";
import { toDocuments } from "@/lib/documents";
import { toDate } from "@/lib/wo-site-display";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/shared/detail-card-parts";
import ProposalActions from "./proposal-actions";
import { PROPOSAL_STATUSES } from "./proposal-wo-display";
import { ClampedText, DocumentsCount, MetaItem, RowCell } from "./row-cell";

interface Props {
  proposal: proposalTypes.proposalType;
}

// A proposal in its row, with everything there is to know about it: title,
// approval status, code, when it went in, its documents and description.
// Admins approve, reject and edit it from its menu.
const ProposalCell = ({ proposal }: Props) => {
  const isAdmin = useIsAdmin();
  const documents = toDocuments(proposal?.documents);
  const title = capitalFirstLetter(proposal?.title || "Untitled proposal");
  const submitted = toDate(proposal?.proposal_submission_date);
  const added = toDate(proposal?.created_at);
  const status =
    PROPOSAL_STATUSES[proposal?.status] ?? PROPOSAL_STATUSES.pending;

  return (
    <RowCell
      title={title}
      aside={
        <Pill className={cn("shrink-0", status.pill)}>{status.label}</Pill>
      }
      action={
        isAdmin && (
          <ProposalActions
            proposal={proposal}
            title={title}
          />
        )
      }
      details={
        proposal?.description && (
          <ClampedText text={capitalFirstLetter(proposal.description)} />
        )
      }>
      <span
        className='min-w-0 truncate font-mono font-medium text-gray-700'
        title={proposal?.code}>
        {proposal?.code}
      </span>
      <MetaItem
        Icon={CalendarDays}
        title={added ? `Added on ${format(added, "d MMM yyyy")}` : undefined}>
        {submitted
          ? `Submitted ${format(submitted, "d MMM yy")}`
          : "Not submitted"}
      </MetaItem>
      <DocumentsCount documents={documents} />
    </RowCell>
  );
};

export default ProposalCell;

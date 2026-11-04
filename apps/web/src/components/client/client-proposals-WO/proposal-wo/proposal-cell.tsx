import React from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { type proposalTypes } from "@pkg/schema";
import useHandleParams from "@/hooks/useHandleParams";
import { toDocuments } from "@/lib/documents";
import { toDate } from "@/lib/wo-site-display";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/shared/detail-card-parts";
import { PROPOSAL_STATUSES } from "./proposal-wo-display";
import { DocumentsCount, MetaItem, RowCell } from "./row-cell";

interface Props {
  proposal: proposalTypes.proposalType;
}

// A proposal in its row: title, approval status, code, when it went in, and
// its documents.
// The description shows when hovering the title.
const ProposalCell = ({ proposal }: Props) => {
  const { setParams } = useHandleParams();
  const documents = toDocuments(proposal?.documents);
  const title = capitalFirstLetter(proposal?.title || "Untitled proposal");
  const submitted = toDate(proposal?.proposal_submission_date);
  const status =
    PROPOSAL_STATUSES[proposal?.status] ?? PROPOSAL_STATUSES.pending;

  return (
    <RowCell
      label={`Open proposal ${title}`}
      title={title}
      tooltip={
        proposal?.description
          ? `${title}\n${capitalFirstLetter(proposal.description)}`
          : title
      }
      aside={
        <Pill className={cn("shrink-0", status.pill)}>{status.label}</Pill>
      }
      onOpen={() =>
        setParams({
          dialog: "proposal-detail",
          "proposal-id": proposal?.id.toString(),
        })
      }>
      <span
        className='min-w-0 truncate font-mono font-medium text-gray-700'
        title={proposal?.code}>
        {proposal?.code}
      </span>
      <MetaItem Icon={CalendarDays}>
        {submitted
          ? `Submitted ${format(submitted, "d MMM yy")}`
          : "Not submitted"}
      </MetaItem>
      <DocumentsCount documents={documents} />
    </RowCell>
  );
};

export default ProposalCell;

import React from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { type proposalTypes } from "@pkg/schema";
import useHandleParams from "@/hooks/useHandleParams";
import { toDocuments } from "@/lib/documents";
import { toDate } from "@/lib/wo-site-display";
import {
  DocumentsChip,
  LinkCard,
  LinkCardBody,
  LinkCardFooter,
  LinkCardHeader,
} from "./link-card-parts";

interface Props {
  proposal: proposalTypes.proposalType;
}

const formatDate = (value: string | Date | null | undefined) => {
  const date = toDate(value);
  return date ? format(date, "d MMM yy") : null;
};

// One proposal: its code, when it went in, and its documents. The whole
// card opens the proposal.
const ProposalCard = ({ proposal }: Props) => {
  const { setParams } = useHandleParams();
  const documents = toDocuments(proposal?.documents);
  const title = capitalFirstLetter(proposal?.title || "Untitled proposal");
  const submittedOn = formatDate(proposal?.proposal_submission_date);
  const addedOn = formatDate(proposal?.created_at);

  return (
    <LinkCard
      label={`Open proposal ${title}`}
      onOpen={() =>
        setParams({
          dialog: "proposal-detail",
          "proposal-id": proposal?.id.toString(),
        })
      }>
      <LinkCardHeader title={title}>
        <span
          className='min-w-0 truncate font-mono font-medium text-gray-700'
          title={proposal?.code}>
          {proposal?.code}
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <CalendarDays className='size-3.5 shrink-0 text-gray-400' />
          {submittedOn ? `Submitted ${submittedOn}` : "Not submitted"}
        </span>
      </LinkCardHeader>

      <LinkCardBody>
        <p className='line-clamp-2 leading-relaxed'>
          {proposal?.description ? (
            capitalFirstLetter(proposal.description)
          ) : (
            <span className='text-gray-400'>No description</span>
          )}
        </p>
      </LinkCardBody>

      <LinkCardFooter>
        <DocumentsChip documents={documents} />
        {addedOn && (
          <span className='ml-auto shrink-0 text-[11px] text-gray-400'>
            Added {addedOn}
          </span>
        )}
      </LinkCardFooter>
    </LinkCard>
  );
};

export default ProposalCard;

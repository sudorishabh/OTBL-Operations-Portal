import { File } from "lucide-react";
import React from "react";
import { format } from "date-fns";
import { capitalFirstLetter } from "@pkg/utils";
import CustomButton from "@/components/shared/btn";
import { type proposalTypes } from "@pkg/schema";
import useHandleParams from "@/hooks/useHandleParams";

interface Props {
  proposal: proposalTypes.proposalType;
}

const ProposalCard = ({ proposal }: Props) => {
  const { setParams } = useHandleParams();

  return (
    <div
      onClick={() =>
        setParams({
          dialog: "proposal-detail",
          "proposal-id": proposal?.id.toString(),
        })
      }
      className='w-full min-w-0 rounded-lg border hover:shadow-sm transition-shadow p-3 sm:p-4 flex flex-col min-h-36 sm:min-h-52 bg-gray-100/50 cursor-pointer hover:border-green-400 group'>
      {/* Header Section */}
      <div className='flex items-start justify-between mb-1.5 sm:mb-2'>
        <div className='flex items-center gap-2'>
          <div className='inline-flex items-center px-2 py-0.5 rounded-sm bg-sky-50 text-sky-700 text-[11px] font-mono ring-1 ring-sky-200'>
            {proposal?.code}
          </div>
        </div>
        <div className='flex items-center gap-1.5 sm:gap-2'>
          {proposal?.document_key && (
            <button
              type='button'
              className='h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white border flex items-center justify-center transition-colors hover:bg-emerald-50 cursor-pointer'
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(proposal.document_key, "_blank");
              }}>
              <File className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-700' />
            </button>
          )}
          <CustomButton
            text='View'
            arrowType='upright'
            variant='arrow'
            className='group-hover:text-white group-hover:bg-emerald-600 transition-colors'
          />
        </div>
      </div>

      {/* Title */}
      <h3 className='text-xs sm:text-sm font-semibold leading-snug text-gray-600 line-clamp-2 break-all min-w-0 mb-1.5 sm:mb-2'>
        {capitalFirstLetter(proposal?.title)}
      </h3>

      {/* Info Grid */}
      <div className='grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3'>
        {/* Submission Date */}
        <div className='flex items-center gap-2 rounded-md bg-white border border-gray-200/70 px-2 sm:px-2.5 py-1.5 sm:py-2'>
          <div className='min-w-0'>
            <div className='text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500'>
              Submitted
            </div>
            <div className='text-[11px] sm:text-xs font-medium text-gray-800 truncate'>
              {proposal?.proposal_submission_date
                ? format(
                    new Date(proposal.proposal_submission_date),
                    "dd MMM yyyy",
                  )
                : "—"}
            </div>
          </div>
        </div>

        {/* Created Date */}
        <div className='flex items-center gap-2 rounded-md bg-white border border-gray-200/70 px-2 sm:px-2.5 py-1.5 sm:py-2'>
          <div className='min-w-0'>
            <div className='text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500'>
              Created
            </div>
            <div className='text-[11px] sm:text-xs font-medium text-gray-800 truncate'>
              {proposal?.created_at
                ? format(new Date(proposal.created_at), "dd MMM yyyy")
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className='text-[11px] sm:text-xs text-gray-600 leading-relaxed line-clamp-2 mb-2 sm:mb-3 flex-1'>
        {proposal?.description || "No description provided."}
      </p>
    </div>
  );
};

export default ProposalCard;

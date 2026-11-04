import React from "react";
import { ArrowRight } from "lucide-react";
import { type proposalTypes } from "@pkg/schema";
import { cn } from "@/lib/utils";
import ProposalCell from "./proposal-cell";
import WorkOrderCell from "./work-order-cell";

// Proposal on the left, an arrow, then the work order made from it.
const ROW_GRID = "md:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)]";

interface Props {
  rows: proposalTypes.getProposalsByClientReturnType[];
}

// Each proposal beside the work order made from it, one row apiece.
const ProposalWOList = ({ rows }: Props) => (
  <div className='overflow-hidden rounded-lg border border-gray-200'>
    <div
      className={cn(
        "hidden gap-2 border-b border-gray-200 bg-gray-50/60 px-2 py-2 text-xs font-medium text-gray-500 md:grid",
        ROW_GRID,
      )}>
      <span className='px-3'>Proposal</span>
      <span />
      <span className='px-3'>Work order</span>
    </div>

    <ul className='divide-y divide-gray-100'>
      {rows.map(({ proposal, workOrder }) => (
        <li
          key={proposal.id}
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
              workOrder={workOrder}
              proposalId={proposal.id}
            />
          </div>
        </li>
      ))}
    </ul>
  </div>
);

export default ProposalWOList;

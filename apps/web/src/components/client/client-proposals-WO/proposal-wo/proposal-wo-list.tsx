import React from "react";
import { ArrowRight } from "lucide-react";
import { type proposalTypes } from "@pkg/schema";
import { cn } from "@/lib/utils";
import ProposalCell from "./proposal-cell";
import WorkOrderCell from "./work-order-cell";

// Proposal on the left, an arrow, then the work order made from it.
const ROW_GRID = "md:grid-cols-[minmax(0,1fr)_1.75rem_minmax(0,1fr)]";

interface Props {
  rows: proposalTypes.getProposalsByClientReturnType[];
  // Below the rows, inside the list's border.
  footer?: React.ReactNode;
}

// Each proposal beside the work order made from it, one row apiece.
const ProposalWOList = ({ rows, footer }: Props) => (
  <div className='overflow-hidden rounded-lg border border-gray-200'>
    <div
      className={cn(
        "hidden gap-3 border-b border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-medium text-gray-500 md:grid",
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
          className={cn("grid grid-cols-1 gap-2 p-3 md:gap-3", ROW_GRID)}>
          <ProposalCell proposal={proposal} />
          <span
            aria-hidden='true'
            className={cn(
              "hidden size-7 place-items-center self-center rounded-full ring-1 md:grid",
              workOrder
                ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
                : "bg-gray-50 text-gray-300 ring-gray-100",
            )}>
            <ArrowRight className='size-3.5' />
          </span>
          {/* Under its proposal on small screens; as tall as it beside it. */}
          <div className='min-w-0'>
            <WorkOrderCell
              workOrder={workOrder}
              proposal={proposal}
            />
          </div>
        </li>
      ))}
    </ul>

    {footer}
  </div>
);

export default ProposalWOList;

import React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, FilePlus2, Plus } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { type proposalTypes, type workOrderTypes } from "@pkg/schema";
import { Pill, STATUS_STYLES } from "@/components/shared/detail-card-parts";
import useHandleParams from "@/hooks/useHandleParams";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/contexts/AuthContext";
import { toDocuments } from "@/lib/documents";
import {
  formatDateRange,
  scheduleNote,
  statusOf,
  toDate,
} from "@/lib/wo-site-display";
import { PROCESSES } from "./proposal-wo-display";
import { DocumentsCount, FactGrid, MetaItem, RowCell } from "./row-cell";

interface Props {
  workOrder: workOrderTypes.workOrderType | null;
  proposal: Pick<proposalTypes.proposalType, "id" | "status">;
}

// The work order's card beside its proposal, or the empty slot in its place.
const CARD = "h-full rounded-lg border";

// Shown in the work order's place until one is made from the proposal.
const NoWorkOrder = ({ proposal }: Pick<Props, "proposal">) => {
  const { setParams } = useHandleParams();
  const isAdmin = useIsAdmin();

  return (
    <div
      className={cn(
        CARD,
        "flex min-h-16 min-w-0 flex-wrap content-center items-center justify-between gap-x-3 gap-y-2 border-dashed border-gray-200 bg-gray-50/50 px-3 py-2.5",
      )}>
      <div className='flex min-w-0 items-center gap-2.5'>
        <span className='grid size-8 shrink-0 place-items-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200'>
          <FilePlus2 className='size-4' />
        </span>
        <div className='min-w-0'>
          <p className='text-sm font-medium text-gray-500'>No work order yet</p>
          <p className='text-xs text-gray-400'>
            {proposal.status === "rejected"
              ? "Its proposal was rejected."
              : isAdmin
                ? "Create one from this proposal."
                : "It will show here once it's created."}
          </p>
        </div>
      </div>
      {isAdmin && (
        <button
          type='button'
          onClick={() =>
            setParams({
              dialog: "create-workorder",
              "proposal-id": proposal.id.toString(),
            })
          }
          className='inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2.5 text-xs font-medium text-emerald-700 shadow-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
          <Plus className='size-3.5' />
          Create work order
        </button>
      )}
    </div>
  );
};

// The work order made from a proposal, as a card that opens it: its code,
// status and how close its end date is, then its process, dates and
// documents, and its purchase order, agreement, rate contract and handover
// lined up underneath. The status arrives already resolved against the
// schedule of rates.
const WorkOrderCell = ({ workOrder, proposal }: Props) => {
  const router = useRouter();

  if (!workOrder) return <NoWorkOrder proposal={proposal} />;

  const status = statusOf(workOrder.status);
  const title = workOrder.code;
  const documents = toDocuments(workOrder.documents);
  const note = scheduleNote(status, workOrder.start_date, workOrder.end_date);
  const processType = PROCESSES[workOrder.process_type];
  const handover = toDate(workOrder.handing_over_date);
  const purchaseOrder = workOrder.purchase_order_code;
  const agreement = workOrder.agreement_number?.toUpperCase();
  const rateContract = workOrder.rate_contract_number?.toUpperCase();

  return (
    <RowCell
      label={`Open work order ${title}`}
      title={title}
      tooltip={
        workOrder.description
          ? `${title}\n${capitalFirstLetter(workOrder.description)}`
          : title
      }
      onOpen={() => router.push(`/dashboard/client/workorder/${workOrder.id}`)}
      className={cn(
        CARD,
        "border-gray-200 bg-gray-50/50 hover:border-emerald-200 hover:bg-emerald-50/30",
      )}
      aside={
        <Pill className={cn("shrink-0", STATUS_STYLES[status])}>
          {capitalFirstLetter(status)}
        </Pill>
      }
      trailing={note && <span className={note.tone}>{note.text}</span>}
      details={
        (handover || purchaseOrder || agreement || rateContract) && (
          <FactGrid
            facts={[
              { label: "Purchase order", value: purchaseOrder },
              { label: "Agreement", value: agreement },
              { label: "Rate contract", value: rateContract },
              {
                label: "Handover",
                value: handover && format(handover, "d MMM yy"),
              },
            ]}
          />
        )
      }>
      {processType && (
        <span className='inline-flex items-center gap-1.5'>
          <span
            className={cn("size-1.5 shrink-0 rounded-full", processType.dot)}
          />
          {processType.label}
        </span>
      )}
      <MetaItem Icon={CalendarDays}>
        {formatDateRange(workOrder.start_date, workOrder.end_date)}
      </MetaItem>
      <DocumentsCount documents={documents} />
    </RowCell>
  );
};

export default WorkOrderCell;

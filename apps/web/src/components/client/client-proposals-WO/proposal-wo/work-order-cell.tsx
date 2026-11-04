import React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarCheck, CalendarDays, Plus } from "lucide-react";
import { capitalFirstLetter, constants } from "@pkg/utils";
import { type workOrderTypes } from "@pkg/schema";
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
import { DocumentsCount, MetaItem, RowCell } from "./row-cell";

const { WO_PROCESS } = constants;

interface Props {
  workOrder: workOrderTypes.workOrderType | null;
  proposalId: number;
}

// A dot rather than a pill, so the process never reads as a second status.
const PROCESSES: Record<string, { label: string; dot: string }> = {
  [WO_PROCESS.BIOREMEDIATION]: { label: "Bioremediation", dot: "bg-blue-500" },
  [WO_PROCESS.RESTORATION]: { label: "Restoration", dot: "bg-purple-500" },
  [WO_PROCESS.BIOREMEDIATION_RESTORATION]: {
    label: "Bio + Restoration",
    dot: "bg-orange-500",
  },
};

// Shown in the work order's place until one is made from the proposal.
const NoWorkOrder = ({ proposalId }: { proposalId: number }) => {
  const { setParams } = useHandleParams();
  const isAdmin = useIsAdmin();

  return (
    <div className='flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-md border border-dashed border-gray-200 px-3 py-2'>
      <span className='text-xs text-gray-400'>No work order yet</span>
      {isAdmin && (
        <button
          type='button'
          onClick={() =>
            setParams({
              dialog: "create-workorder",
              "proposal-id": proposalId.toString(),
            })
          }
          className='inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
          <Plus className='size-3.5' />
          Create work order
        </button>
      )}
    </div>
  );
};

// The work order made from a proposal: status, how close its end date is,
// its process, dates and documents. The status arrives already resolved
// against the schedule of rates.
const WorkOrderCell = ({ workOrder, proposalId }: Props) => {
  const router = useRouter();

  if (!workOrder) return <NoWorkOrder proposalId={proposalId} />;

  const status = statusOf(workOrder.status);
  const title = capitalFirstLetter(workOrder.title || "Untitled work order");
  const documents = toDocuments(workOrder.documents);
  const note = scheduleNote(status, workOrder.start_date, workOrder.end_date);
  const processType = PROCESSES[workOrder.process_type];
  const handover = toDate(workOrder.handing_over_date);

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
      aside={
        <Pill className={cn("shrink-0", STATUS_STYLES[status])}>
          {capitalFirstLetter(status)}
        </Pill>
      }
      trailing={note && <span className={note.tone}>{note.text}</span>}>
      <span
        className='min-w-0 truncate font-mono font-medium text-gray-700'
        title={workOrder.code}>
        {workOrder.code.toUpperCase()}
      </span>
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
      {handover && (
        <MetaItem
          Icon={CalendarCheck}
          title='Handover date'>
          Handover {format(handover, "d MMM yy")}
        </MetaItem>
      )}
      <DocumentsCount documents={documents} />
    </RowCell>
  );
};

export default WorkOrderCell;

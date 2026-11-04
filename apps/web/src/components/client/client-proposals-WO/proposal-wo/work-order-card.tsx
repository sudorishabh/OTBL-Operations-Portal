import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarCheck, CalendarDays, Plus } from "lucide-react";
import {
  capitalFirstLetter,
  computeSorFullyConsumed,
  constants,
} from "@pkg/utils";
import { type workOrderTypes } from "@pkg/schema";
import CustomButton from "@/components/shared/btn";
import {
  Pill,
  PROCESS_STYLES,
  STATUS_STYLES,
} from "@/components/shared/detail-card-parts";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";
import { useIsAdmin } from "@/contexts/AuthContext";
import { toDocuments } from "@/lib/documents";
import {
  formatDateRange,
  scheduleNote,
  statusOf,
  toDate,
} from "@/lib/wo-site-display";
import {
  DocumentsChip,
  LinkCard,
  LinkCardBody,
  LinkCardFooter,
  LinkCardHeader,
} from "./link-card-parts";

const { WO_PROCESS } = constants;

interface Props {
  workOrder: workOrderTypes.workOrderType | null;
  proposalId: number;
}

// Short enough to sit in a pill beside the code.
const PROCESS_LABELS: Record<string, string> = {
  [WO_PROCESS.BIOREMEDIATION]: "Bioremediation",
  [WO_PROCESS.RESTORATION]: "Restoration",
  [WO_PROCESS.BIOREMEDIATION_RESTORATION]: "Bio + Restoration",
};

const formatDate = (value: string | Date | null | undefined) => {
  const date = toDate(value);
  return date ? format(date, "d MMM yy") : null;
};

// Shown in the work order's place until one is made from the proposal.
const NoWorkOrder = ({ proposalId }: { proposalId: number }) => {
  const { setParams } = useHandleParams();
  const isAdmin = useIsAdmin();

  return (
    <div className='flex h-full min-h-36 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center'>
      <p className='text-xs text-gray-500'>
        {isAdmin
          ? "No work order yet. Create one to start tracking this proposal."
          : "No work order has been made from this proposal yet."}
      </p>
      {isAdmin && (
        <CustomButton
          Icon={Plus}
          text='Create Work Order'
          variant='outline'
          onClick={() =>
            setParams({
              dialog: "create-workorder",
              "proposal-id": proposalId.toString(),
            })
          }
        />
      )}
    </div>
  );
};

// The work order made from a proposal: its status, process, dates and
// documents. The whole card opens the work order.
const WordOrderCard = ({ workOrder, proposalId }: Props) => {
  const router = useRouter();

  const { data: woDetails } = trpc.workOrderQuery.getWorkOrderDetails.useQuery(
    { id: Number(workOrder?.id) },
    { enabled: !!workOrder?.id },
  );

  // A work order completes once its schedule of rates is used up.
  const resolvedStatus = useMemo(() => {
    if (!workOrder) return undefined;

    if (woDetails?.workOrder) {
      if (woDetails.workOrder.status === "cancelled") return "cancelled";

      const scheduleOfRates = woDetails.scheduleOfRates || [];
      const sites = woDetails.sites || [];

      if (scheduleOfRates.length === 0) {
        return woDetails.workOrder.status || workOrder.status;
      }

      return computeSorFullyConsumed(scheduleOfRates, sites)
        ? "completed"
        : "pending";
    }

    return workOrder.status;
  }, [workOrder, woDetails]);

  if (!workOrder) return <NoWorkOrder proposalId={proposalId} />;

  const status = statusOf(resolvedStatus);
  const title = capitalFirstLetter(workOrder.title || "Untitled work order");
  const documents = toDocuments(workOrder.documents);
  const note = scheduleNote(status, workOrder.start_date, workOrder.end_date);
  const handoverOn = formatDate(workOrder.handing_over_date);
  const addedOn = formatDate(workOrder.created_at);

  return (
    <LinkCard
      label={`Open work order ${title}`}
      onOpen={() => router.push(`/dashboard/client/workorder/${workOrder.id}`)}>
      <LinkCardHeader
        title={title}
        aside={
          <Pill className={`shrink-0 ${STATUS_STYLES[status]}`}>
            {capitalFirstLetter(status)}
          </Pill>
        }>
        <span
          className='min-w-0 truncate font-mono font-medium text-gray-700'
          title={workOrder.code}>
          {workOrder.code.toUpperCase()}
        </span>
        {workOrder.process_type && (
          <Pill
            className={
              PROCESS_STYLES[workOrder.process_type] ??
              "bg-gray-50 text-gray-700 ring-gray-200"
            }>
            {PROCESS_LABELS[workOrder.process_type] ?? workOrder.process_type}
          </Pill>
        )}
      </LinkCardHeader>

      <LinkCardBody>
        <p className='flex flex-wrap items-center gap-x-3 gap-y-0.5'>
          <span className='inline-flex items-center gap-1.5'>
            <CalendarDays className='size-3.5 text-gray-400' />
            {formatDateRange(workOrder.start_date, workOrder.end_date)}
          </span>
          {note && <span className={note.tone}>{note.text}</span>}
        </p>
        <p className='flex items-center gap-1.5'>
          <CalendarCheck className='size-3.5 text-gray-400' />
          {handoverOn ? (
            `Handover ${handoverOn}`
          ) : (
            <span className='text-gray-400'>No handover date</span>
          )}
        </p>
        {workOrder.description && (
          <p className='line-clamp-1 text-gray-500'>
            {capitalFirstLetter(workOrder.description)}
          </p>
        )}
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

export default WordOrderCard;

"use client";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { capitalFirstLetter } from "@pkg/utils";
import { format } from "date-fns";
import {
  Search,
  FileText,
  XCircle,
  Briefcase,
  Check,
  Link2Off,
  Hash,
  FileSignature,
  ExternalLink,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import CustomButton from "@/components/shared/btn";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";

interface Props {
  clientId: number;
}

const SOR_ACTIVITY_TO_COMPLETION_ACTIVITY: Record<string, string> = {
  clean_soil_area: "clean_soil_area",
  lifting_oily_slush_or_recovery_of_oil: "lifting_oil_slush",
  excavation_oil_contaminated_soil: "excav_cont_soil",
  transportation_contaminated_soil: "trans_cont_soil",
  refilling_excavated_oil_contaminated_soil_land: "refill_excav_soil",
  bioremediation_oil_contaminated_soil: "biorem_cont_soil",
};

const activityKey = (name: string) => {
  const v = (name || "").trim().toLowerCase();
  return v
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
};

const toNumberSafe = (val: unknown) => {
  const n =
    typeof val === "string"
      ? Number(val.replace(/,/g, "").trim())
      : Number(val);
  return Number.isFinite(n) ? n : 0;
};

const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return null;
  return format(new Date(date), "dd MMM yyyy");
};

const getStatusTone = (status: string) => {
  switch (status) {
    case "approved":
    case "completed":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        dot: "bg-emerald-500",
      };
    case "rejected":
    case "cancelled":
      return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" };
    default:
      return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
  }
};

const PROCESS_LABELS: Record<string, string> = {
  bioremediation: "Bioremediation",
  restoration: "Restoration",
  bioremediation_restoration: "Bioremediation + restoration",
};

const StatusPill = ({ status }: { status: string }) => {
  const tone = getStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        tone.bg,
        tone.text,
      )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
      {capitalFirstLetter(status)}
    </span>
  );
};

const CodeChip = ({
  icon: Icon,
  code,
  tone,
}: {
  icon: React.ElementType;
  code: string;
  tone: "sky" | "emerald";
}) => (
  <span
    title={code}
    className={cn(
      "inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium ring-1 ring-inset",
      tone === "sky"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : "bg-emerald-50 text-emerald-700 ring-emerald-100",
    )}>
    <Icon className='h-3 w-3 shrink-0 opacity-60' />
    <span className='truncate'>{code}</span>
  </span>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className='min-w-0'>
    <div className='text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
      {label}
    </div>
    <div className='mt-0.5 truncate text-xs font-medium text-gray-700'>
      {children ?? <span className='text-gray-300'>&mdash;</span>}
    </div>
  </div>
);

const DocumentLink = ({
  href,
  tone,
}: {
  href: string;
  tone: "sky" | "emerald";
}) => (
  <a
    href={href}
    target='_blank'
    rel='noreferrer'
    onClick={(e) => e.stopPropagation()}
    className={cn(
      "inline-flex items-center gap-1 text-[11px] font-medium underline-offset-2 hover:underline",
      tone === "sky" ? "text-sky-600" : "text-emerald-600",
    )}>
    <ExternalLink className='h-3 w-3' />
    Document
  </a>
);

const ProposalSide = ({
  proposal,
  onOpen,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposal: any;
  onOpen: () => void;
}) => (
  <div
    onClick={onOpen}
    className='flex cursor-pointer flex-col rounded-lg p-2.5 transition-colors duration-200 hover:bg-sky-50/60'>
    <div className='flex items-center justify-between gap-2'>
      <div className='flex min-w-0 flex-wrap items-center gap-2'>
        <CodeChip
          icon={Hash}
          code={proposal.code}
          tone='sky'
        />
        <StatusPill status={proposal.status} />
      </div>
      <CustomButton
        text='View proposal'
        variant='arrow'
        arrowType='upright'
        className='h-7 shrink-0 pl-2.5 text-[11px]'
        onClick={(e) => {
          e?.stopPropagation();
          onOpen();
        }}
      />
    </div>

    <h4 className='mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-gray-900'>
      {capitalFirstLetter(proposal.title)}
    </h4>

    <div className='mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2'>
      <Field label='Submitted'>
        {formatDate(proposal.proposal_submission_date)}
      </Field>
      <Field label='Created'>{formatDate(proposal.created_at)}</Field>
    </div>

    {proposal.document_key && (
      <div className='mt-2'>
        <DocumentLink
          href={proposal.document_key}
          tone='sky'
        />
      </div>
    )}
  </div>
);

const ResolvedWorkOrderSide = ({
  workOrder,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workOrder: any;
}) => {
  const router = useRouter();

  const { data: woDetails } = trpc.workOrderQuery.getWorkOrderDetails.useQuery(
    { id: Number(workOrder?.id) },
    { enabled: !!workOrder?.id },
  );

  const resolvedStatus = useMemo(() => {
    if (!workOrder) return undefined;

    if (woDetails?.workOrder) {
      if (woDetails.workOrder.status === "cancelled") return "cancelled";

      const scheduleOfRates = woDetails.scheduleOfRates || [];
      const sites = woDetails.sites || [];

      if (scheduleOfRates.length === 0) {
        return woDetails.workOrder.status || workOrder.status;
      }

      const usedQtyByActivity: Record<string, number> = (sites || []).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc: Record<string, number>, s: any) => {
          for (const c of s.completions || []) {
            const key = activityKey(c.activity_name);
            acc[key] = (acc[key] || 0) + toNumberSafe(c.estimated_quantity);
          }
          return acc;
        },
        {},
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isSORFullyUsed = scheduleOfRates.every((item: any) => {
        const completionActivity =
          SOR_ACTIVITY_TO_COMPLETION_ACTIVITY[item.activity] ?? item.activity;
        const usedQty = usedQtyByActivity[activityKey(completionActivity)] ?? 0;
        const sorQty = toNumberSafe(item.estimated_quantity);
        if (sorQty <= 0) return true;
        return usedQty + 1e-6 >= sorQty;
      });

      return isSORFullyUsed ? "completed" : "pending";
    }

    return workOrder.status;
  }, [workOrder, woDetails]);

  if (!workOrder) {
    return (
      <div className='m-2.5 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-200 p-4 text-center'>
        <Briefcase className='h-4 w-4 text-gray-300' />
        <p className='text-xs font-medium text-gray-500'>No work order yet</p>
        <p className='text-[11px] leading-relaxed text-gray-400'>
          This proposal has not been converted.
        </p>
      </div>
    );
  }

  const openWorkOrder = () =>
    router.push(`/dashboard/client/workorder/${workOrder.id}`);

  return (
    <div
      onClick={openWorkOrder}
      className='flex cursor-pointer flex-col rounded-lg p-2.5 transition-colors duration-200 hover:bg-emerald-50/60'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <CodeChip
            icon={Briefcase}
            code={workOrder.code}
            tone='emerald'
          />
          {resolvedStatus && <StatusPill status={resolvedStatus} />}
        </div>
        <CustomButton
          text='Open work order'
          variant='arrow'
          arrowType='upright'
          className='h-7 shrink-0 pl-2.5 text-[11px]'
          onClick={(e) => {
            e?.stopPropagation();
            openWorkOrder();
          }}
        />
      </div>

      <h4 className='mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-gray-900'>
        {workOrder.title
          ? capitalFirstLetter(workOrder.title)
          : "Untitled work order"}
      </h4>

      <div className='mt-2.5 grid grid-cols-3 gap-x-3 gap-y-2'>
        <Field label='Start'>{formatDate(workOrder.start_date)}</Field>
        <Field label='End'>{formatDate(workOrder.end_date)}</Field>
        <Field label='Handover'>
          {formatDate(workOrder.handing_over_date)}
        </Field>
      </div>

      {(PROCESS_LABELS[workOrder.process_type] ||
        workOrder.agreement_number ||
        workOrder.document_key) && (
        <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500'>
          {PROCESS_LABELS[workOrder.process_type] && (
            <span>{PROCESS_LABELS[workOrder.process_type]}</span>
          )}
          {workOrder.agreement_number && (
            <span className='inline-flex items-center gap-1'>
              <FileSignature className='h-3 w-3 text-gray-400' />
              Agreement {workOrder.agreement_number}
            </span>
          )}
          {workOrder.document_key && (
            <DocumentLink
              href={workOrder.document_key}
              tone='emerald'
            />
          )}
        </div>
      )}
    </div>
  );
};

// The rail carries the actual point of the row: whether the proposal on the
// left ever became the work order on the right.
const LinkRail = ({ linked }: { linked: boolean }) => (
  <div className='relative flex items-center justify-center py-1.5 md:w-10 md:py-0'>
    <div
      aria-hidden
      className='absolute inset-0 flex items-center justify-center'>
      <div className='w-full border-t border-dashed border-gray-200 md:h-full md:w-0 md:border-l md:border-t-0' />
    </div>
    <span
      title={linked ? "Linked to a work order" : "Not linked to a work order"}
      className={cn(
        "relative z-10 inline-flex items-center justify-center rounded-full bg-white p-1 ring-1",
        linked
          ? "text-emerald-600 ring-emerald-200"
          : "text-gray-300 ring-gray-200",
      )}>
      {linked ? (
        <Check className='h-3 w-3' />
      ) : (
        <Link2Off className='h-3 w-3' />
      )}
    </span>
  </div>
);

const ProposalRowSkeleton = () => (
  <div className='animate-pulse rounded-xl border border-gray-200 bg-white p-1 sm:p-1.5'>
    <div className='grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'>
      <div className='space-y-2.5 p-2.5'>
        <div className='flex gap-2'>
          <div className='h-5 w-24 rounded-md bg-gray-100' />
          <div className='h-5 w-20 rounded-full bg-gray-100' />
        </div>
        <div className='h-4 w-3/4 rounded bg-gray-100' />
        <div className='grid grid-cols-2 gap-3'>
          <div className='h-8 rounded bg-gray-50' />
          <div className='h-8 rounded bg-gray-50' />
        </div>
      </div>
      <div className='flex items-center justify-center py-1.5 md:w-10 md:py-0'>
        <div className='h-6 w-6 rounded-full bg-gray-100' />
      </div>
      <div className='space-y-2.5 p-2.5'>
        <div className='flex gap-2'>
          <div className='h-5 w-24 rounded-md bg-gray-100' />
          <div className='h-5 w-20 rounded-full bg-gray-100' />
        </div>
        <div className='h-4 w-2/3 rounded bg-gray-100' />
        <div className='grid grid-cols-3 gap-3'>
          <div className='h-8 rounded bg-gray-50' />
          <div className='h-8 rounded bg-gray-50' />
          <div className='h-8 rounded bg-gray-50' />
        </div>
      </div>
    </div>
  </div>
);

const ProposalWODetailsDialog = ({ clientId }: Props) => {
  const { getParam, setParam, setParams, deleteParam, deleteParams } =
    useHandleParams();
  const isOpen = getParam("dialog") === "proposal-wo";
  const isFull = getParam("window") === "full";

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [allProposals, setAllProposals] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
    setAllProposals([]);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!isOpen) {
      setPage(1);
      setSearchQuery("");
      setDebouncedSearch("");
      setAllProposals([]);
    }
  }, [isOpen]);

  const { data, isLoading, isFetching } =
    trpc.proposalQuery.getProposalsByClientPaginated.useQuery(
      {
        client_id: clientId,
        page,
        limit: 10,
        searchQuery: debouncedSearch || undefined,
      },
      {
        enabled: isOpen && !!clientId,
      },
    );

  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;

  useEffect(() => {
    if (!data?.proposals) return;
    if (page === 1) {
      setAllProposals(data.proposals);
    } else {
      setAllProposals((prev) => [...prev, ...data.proposals]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleLoadMore = () => {
    if (pagination?.hasMore) setPage((prev) => prev + 1);
  };

  const openProposal = (proposalId: number) => {
    deleteParams(["dialog", "window"]);
    setTimeout(() => {
      setParams({
        dialog: "proposal-detail",
        "proposal-id": proposalId.toString(),
      });
    }, 100);
  };

  return (
    <DialogWindow
      open={isOpen}
      setOpen={() => deleteParams(["dialog", "window"])}
      size='2xl'
      heightFull={true}
      title='Proposals & Work Orders'
      description='Every proposal for this client, and the work order it became.'
      isFullScreen={isFull}
      onToggleFullScreen={() =>
        isFull ? deleteParam("window") : setParam("window", "full")
      }>
      <div className='flex h-full flex-col'>
        <div className='relative shrink-0'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400' />
          <input
            type='text'
            placeholder='Search by code or title'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 transition-colors duration-200 placeholder:text-gray-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'
          />
          {searchQuery && (
            <button
              type='button'
              aria-label='Clear search'
              onClick={() => setSearchQuery("")}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600'>
              <XCircle className='h-4 w-4' />
            </button>
          )}
        </div>

        {/* Soft well behind the list so the white cards read as separate
            surfaces against the dialog. */}
        <div className='mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl bg-gray-50/70 p-2'>
          {isLoading ? (
            <div className='space-y-2.5'>
              {Array.from({ length: 3 }).map((_, i) => (
                <ProposalRowSkeleton key={i} />
              ))}
            </div>
          ) : allProposals.length === 0 ? (
            <div className='flex h-full flex-col items-center justify-center py-16 text-center'>
              <div className='mb-4 rounded-xl bg-gray-50 p-3 text-gray-400'>
                <FileText className='h-6 w-6' />
              </div>
              <h3 className='text-sm font-semibold text-gray-800'>
                {debouncedSearch ? "No matching proposals" : "No proposals yet"}
              </h3>
              <p className='mt-1 max-w-xs text-xs leading-relaxed text-gray-500'>
                {debouncedSearch
                  ? `Nothing matches "${debouncedSearch}". Try another code or title.`
                  : "Create a proposal to start tracking work orders for this client."}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "space-y-2.5 transition-opacity duration-200",
                isFetching && !isLoading ? "opacity-60" : "opacity-100",
              )}>
              {allProposals.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ({ proposal, workOrder }: any) => (
                  <div
                    key={proposal.id}
                    className='rounded-xl border border-gray-200 bg-white p-1 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md sm:p-1.5'>
                    <div className='grid grid-cols-1 items-stretch md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'>
                      <ProposalSide
                        proposal={proposal}
                        onOpen={() => openProposal(proposal.id)}
                      />
                      <LinkRail linked={!!workOrder} />
                      <ResolvedWorkOrderSide workOrder={workOrder} />
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {total > 0 && (
          <div className='mt-4 shrink-0 border-t border-gray-100 pt-4'>
            <p className='mb-2 text-xs text-gray-500'>
              Showing{" "}
              <span className='font-medium text-gray-700'>
                {allProposals.length}
              </span>{" "}
              of <span className='font-medium text-gray-700'>{total}</span>
            </p>
            {pagination?.hasMore && (
              <LoadMoreBtn
                onClick={handleLoadMore}
                loading={isFetching && !isLoading}
              />
            )}
          </div>
        )}
      </div>
    </DialogWindow>
  );
};

export default ProposalWODetailsDialog;

"use client";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { capitalFirstLetter } from "@pkg/utils";
import { format, isSameYear } from "date-fns";
import {
  Search,
  FileText,
  XCircle,
  Briefcase,
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

const toDate = (date: Date | string | null | undefined) =>
  date ? new Date(date) : null;

const formatDate = (date: Date | string | null | undefined) => {
  const d = toDate(date);
  return d ? format(d, "dd MMM yyyy") : null;
};

// "01 Apr – 30 Jun 2026" when the year is shared, so a run of work reads as one
// span rather than two unrelated dates.
const formatDateRange = (
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
) => {
  const from = toDate(start);
  const to = toDate(end);
  if (from && to) {
    return isSameYear(from, to)
      ? `${format(from, "dd MMM")} – ${format(to, "dd MMM yyyy")}`
      : `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`;
  }
  if (from) return `From ${format(from, "dd MMM yyyy")}`;
  if (to) return `Until ${format(to, "dd MMM yyyy")}`;
  return null;
};

const isDone = (status?: string) =>
  status === "approved" || status === "completed";
const isStopped = (status?: string) =>
  status === "rejected" || status === "cancelled";

const getStatusTone = (status: string) => {
  if (isDone(status))
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    };
  if (isStopped(status))
    return { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" };
  return { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" };
};

// The spine on the card's left edge is the one thing readable while scrolling
// fast: where this proposal ended up.
const getSpineClass = (proposalStatus: string, woStatus?: string) => {
  if (!woStatus) {
    return isStopped(proposalStatus)
      ? "bg-red-200"
      : "bg-[repeating-linear-gradient(180deg,#e5e7eb_0_5px,transparent_5px_10px)]";
  }
  if (isStopped(woStatus)) return "bg-red-300";
  if (isDone(woStatus)) return "bg-emerald-400";
  return "bg-amber-300";
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-[3px] text-[11px] font-semibold",
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
      "inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-medium ring-1 ring-inset",
      tone === "sky"
        ? "bg-sky-50 text-sky-700 ring-sky-100"
        : "bg-emerald-50 text-emerald-700 ring-emerald-100",
    )}>
    <Icon className='h-3.5 w-3.5 shrink-0 opacity-60' />
    <span className='truncate'>{code}</span>
  </span>
);

const StageLabel = ({ children }: { children: React.ReactNode }) => (
  <span className='text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500'>
    {children}
  </span>
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
      "inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline",
      tone === "sky" ? "text-sky-600" : "text-emerald-600",
    )}>
    <ExternalLink className='h-3.5 w-3.5' />
    Document
  </a>
);

// One step of the proposal to work order run. `connected` draws the thread
// down to the step below it.
const Stage = ({
  marker,
  connected = false,
  children,
}: {
  marker: React.ReactNode;
  connected?: boolean;
  children: React.ReactNode;
}) => (
  <li className='relative grid grid-cols-[14px_minmax(0,1fr)] gap-x-3'>
    {connected && (
      <span
        aria-hidden
        className='absolute bottom-[-20px] left-[6.5px] top-4 w-px bg-gray-200'
      />
    )}
    <span className='relative z-10 mt-1 flex h-3.5 w-3.5 items-center justify-center'>
      {marker}
    </span>
    <div className='min-w-0'>{children}</div>
  </li>
);

const StageMeta = ({ children }: { children: React.ReactNode }) => (
  <div className='mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-gray-600'>
    {children}
  </div>
);

const useResolvedWorkOrderStatus = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workOrder: any,
): string | undefined => {
  const { data: woDetails } = trpc.workOrderQuery.getWorkOrderDetails.useQuery(
    { id: Number(workOrder?.id) },
    { enabled: !!workOrder?.id },
  );

  return useMemo(() => {
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
};

const normalizeTitle = (title?: string | null) =>
  (title || "").trim().toLowerCase().replace(/\s+/g, " ");

const ProposalRow = ({
  proposal,
  workOrder,
  onOpenProposal,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposal: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  workOrder: any;
  onOpenProposal: () => void;
}) => {
  const router = useRouter();
  const woStatus = useResolvedWorkOrderStatus(workOrder);

  const openWorkOrder = () => {
    if (workOrder) router.push(`/dashboard/client/workorder/${workOrder.id}`);
  };

  const primary = workOrder
    ? { label: "Open work order", run: openWorkOrder }
    : { label: "View proposal", run: onOpenProposal };

  // The work order usually repeats the proposal title; only show it when
  // whoever created it typed something different.
  const distinctWOTitle =
    workOrder?.title &&
    normalizeTitle(workOrder.title) !== normalizeTitle(proposal.title)
      ? capitalFirstLetter(workOrder.title)
      : null;

  const dateRange = workOrder
    ? formatDateRange(workOrder.start_date, workOrder.end_date)
    : null;
  const handover = workOrder ? formatDate(workOrder.handing_over_date) : null;
  const submitted = formatDate(proposal.proposal_submission_date);

  return (
    <article
      onClick={primary.run}
      className='group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md'>
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          getSpineClass(proposal.status, woStatus),
        )}
      />

      <div className='py-3 pl-5 pr-3'>
        <div className='flex items-start justify-between gap-3'>
          <h4 className='line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900'>
            {capitalFirstLetter(proposal.title)}
          </h4>
          <CustomButton
            text={primary.label}
            variant='arrow'
            arrowType='upright'
            className='h-8 shrink-0 pl-3 text-xs'
            onClick={(e) => {
              e?.stopPropagation();
              primary.run();
            }}
          />
        </div>

        <ol className='mt-3 space-y-4'>
          <Stage
            connected
            marker={
              <span className='h-2.5 w-2.5 rotate-45 rounded-[2px] bg-sky-400 ring-4 ring-sky-50' />
            }>
            <div className='flex min-w-0 flex-wrap items-center gap-2'>
              <StageLabel>Proposal</StageLabel>
              <CodeChip
                icon={Hash}
                code={proposal.code}
                tone='sky'
              />
              <StatusPill status={proposal.status} />
            </div>
            <StageMeta>
              {submitted && <span>Submitted {submitted}</span>}
              {proposal.document_key && (
                <DocumentLink
                  href={proposal.document_key}
                  tone='sky'
                />
              )}
              {workOrder && (
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProposal();
                  }}
                  className='font-medium text-sky-600 underline-offset-2 hover:underline'>
                  View proposal
                </button>
              )}
            </StageMeta>
          </Stage>

          <Stage
            marker={
              workOrder ? (
                <span className='h-2.5 w-2.5 rotate-45 rounded-[2px] bg-emerald-500 ring-4 ring-emerald-50' />
              ) : (
                <span className='h-3 w-3 rounded-full border border-dashed border-gray-300 bg-white' />
              )
            }>
            {workOrder ? (
              <>
                <div className='flex min-w-0 flex-wrap items-center gap-2'>
                  <StageLabel>Work order</StageLabel>
                  <CodeChip
                    icon={Briefcase}
                    code={workOrder.code}
                    tone='emerald'
                  />
                  {woStatus && <StatusPill status={woStatus} />}
                </div>
                {distinctWOTitle && (
                  <p className='mt-1.5 line-clamp-1 text-[13px] text-gray-600'>
                    {distinctWOTitle}
                  </p>
                )}
                <StageMeta>
                  {dateRange && (
                    <span className='font-medium text-gray-700'>
                      {dateRange}
                    </span>
                  )}
                  {handover && <span>Handover {handover}</span>}
                  {PROCESS_LABELS[workOrder.process_type] && (
                    <span>{PROCESS_LABELS[workOrder.process_type]}</span>
                  )}
                  {workOrder.agreement_number && (
                    <span className='inline-flex items-center gap-1'>
                      <FileSignature className='h-3.5 w-3.5 text-gray-400' />
                      Agreement {workOrder.agreement_number}
                    </span>
                  )}
                  {workOrder.document_key && (
                    <DocumentLink
                      href={workOrder.document_key}
                      tone='emerald'
                    />
                  )}
                </StageMeta>
              </>
            ) : (
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                <StageLabel>Work order</StageLabel>
                <span className='text-xs text-gray-500'>Not created yet</span>
              </div>
            )}
          </Stage>
        </ol>
      </div>
    </article>
  );
};

const ProposalRowSkeleton = () => (
  <div className='relative animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white'>
    <span className='absolute inset-y-0 left-0 w-1 bg-gray-100' />
    <div className='py-3 pl-5 pr-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='h-4 w-2/5 rounded bg-gray-100' />
        <div className='h-8 w-32 rounded-full bg-gray-100' />
      </div>
      <div className='mt-4 space-y-4'>
        {[0, 1].map((i) => (
          <div
            key={i}
            className='grid grid-cols-[14px_minmax(0,1fr)] gap-x-3'>
            <div className='mt-1 h-3 w-3 rounded-full bg-gray-100' />
            <div className='space-y-2'>
              <div className='h-4 w-1/2 rounded bg-gray-100' />
              <div className='h-3 w-2/3 rounded bg-gray-50' />
            </div>
          </div>
        ))}
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
            <div className='grid gap-2.5 xl:grid-cols-2'>
              {Array.from({ length: 4 }).map((_, i) => (
                <ProposalRowSkeleton key={i} />
              ))}
            </div>
          ) : allProposals.length === 0 ? (
            <div className='flex h-full flex-col items-center justify-center py-16 text-center'>
              <div className='mb-4 rounded-xl bg-white p-3 text-gray-400 shadow-sm'>
                <FileText className='h-6 w-6' />
              </div>
              <h3 className='text-[15px] font-semibold text-gray-800'>
                {debouncedSearch ? "No matching proposals" : "No proposals yet"}
              </h3>
              <p className='mt-1 max-w-sm text-sm leading-relaxed text-gray-500'>
                {debouncedSearch
                  ? `Nothing matches "${debouncedSearch}". Try another code or title.`
                  : "Create a proposal to start tracking work orders for this client."}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-2.5 transition-opacity duration-200 xl:grid-cols-2",
                isFetching && !isLoading ? "opacity-60" : "opacity-100",
              )}>
              {allProposals.map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ({ proposal, workOrder }: any) => (
                  <ProposalRow
                    key={proposal.id}
                    proposal={proposal}
                    workOrder={workOrder}
                    onOpenProposal={() => openProposal(proposal.id)}
                  />
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

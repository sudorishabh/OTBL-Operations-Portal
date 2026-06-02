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
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
  Check,
  Link2Off,
  Hash,
  FileCode,
  Calendar,
  CalendarCheck,
  Beaker,
  Shovel,
  AlignEndHorizontal,
  ExternalLink,
} from "lucide-react";
import React, { useMemo, useState, useEffect } from "react";
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
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy");
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
    case "completed":
      return {
        icon: CheckCircle2,
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-emerald-200",
        dot: "bg-emerald-500",
      };
    case "rejected":
    case "cancelled":
      return {
        icon: XCircle,
        bg: "bg-red-50",
        text: "text-red-700",
        ring: "ring-red-200",
        dot: "bg-red-500",
      };
    default:
      return {
        icon: Clock,
        bg: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-amber-200",
        dot: "bg-amber-500",
      };
  }
};

const getProcessTypeConfig = (type: string) => {
  switch (type) {
    case "bioremediation":
      return {
        label: "Bioremediation",
        color: "text-emerald-600",
      };
    case "restoration":
      return { label: "Restoration", color: "text-green-600" };
    case "bioremediation_restoration":
      return {
        label: "Bio + Restoration",
        color: "text-emerald-600",
      };
    default:
      return { label: type, color: "text-gray-600" };
  }
};

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
        (acc: Record<string, number>, s: any) => {
          for (const c of s.completions || []) {
            const key = activityKey(c.activity_name);
            acc[key] = (acc[key] || 0) + toNumberSafe(c.estimated_quantity);
          }
          return acc;
        },
        {},
      );

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

  const woStatus = resolvedStatus ? getStatusConfig(resolvedStatus) : null;
  const WOStatusIcon = woStatus?.icon;

  const processConfig = workOrder
    ? getProcessTypeConfig(workOrder.process_type)
    : null;

  return (
    <div
      className={`md:pl-3 rounded transition-colors duration-200 -m-1 p-1 ${
        workOrder ? "cursor-pointer hover:bg-emerald-50/50" : ""
      }`}
      onClick={() => {
        if (workOrder) {
          router.push(`/dashboard/client/workorder/${workOrder.id}`);
        }
      }}
      title={workOrder ? "Go to work order page" : undefined}>
      {workOrder ? (
        <>
          <div className='flex items-center gap-2 mb-2.5'>
            <span className='inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-mono font-medium ring-1 ring-emerald-200'>
              <Briefcase className='w-3 h-3 mr-1 opacity-60' />
              {workOrder.code}
            </span>
            {woStatus && WOStatusIcon && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${woStatus.bg} ${woStatus.text} ring-1 ${woStatus.ring}`}>
                <WOStatusIcon className='w-3 h-3' />
                {capitalFirstLetter(resolvedStatus || workOrder.status)}
              </span>
            )}
          </div>

          <h4 className='text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2'>
            {workOrder.title
              ? capitalFirstLetter(workOrder.title)
              : "Untitled Work Order"}
          </h4>

          {processConfig ? (
            <span className={`text-[11px] font-medium ${processConfig.color}`}>
              {processConfig.label}
            </span>
          ) : null}

          <div className='grid grid-cols-3 gap-1.5 mb-2.5'>
            <div className='flex items-center gap-1 rounded-md bg-white border border-gray-200/70 px-2 py-1.5'>
              <div className='min-w-0'>
                <div className='text-[8px] uppercase tracking-wider text-gray-400'>
                  Start
                </div>
                <div className='text-[10px] font-medium text-gray-700 truncate'>
                  {formatDate(workOrder.start_date)}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-1 rounded-md bg-white border border-gray-200/70 px-2 py-1.5'>
              <div className='min-w-0'>
                <div className='text-[8px] uppercase tracking-wider text-gray-400'>
                  End
                </div>
                <div className='text-[10px] font-medium text-gray-700 truncate'>
                  {formatDate(workOrder.end_date)}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-1 rounded-md bg-white border border-gray-200/70 px-2 py-1.5'>
              <div className='min-w-0'>
                <div className='text-[8px] uppercase tracking-wider text-gray-400'>
                  Handover
                </div>
                <div className='text-[10px] font-medium text-gray-700 truncate'>
                  {formatDate(workOrder.handing_over_date)}
                </div>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            {workOrder.agreement_number && (
              <div className='flex items-center gap-1 text-[11px] text-gray-400'>
                <FileCode className='w-3 h-3' />
                AGR: {workOrder.agreement_number}
              </div>
            )}
            {workOrder.document_key && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(workOrder.document_key, "_blank");
                }}
                className='inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-700 transition-colors'>
                <ExternalLink className='w-3 h-3' />
                Document
              </button>
            )}
          </div>
        </>
      ) : (
        <div className='flex flex-col items-center justify-center h-full text-center py-4'>
          <div className='p-2.5 rounded-xl bg-linear-to-br from-gray-100 to-gray-50 text-gray-400 mb-3'>
            <Briefcase className='w-5 h-5' />
          </div>
          <p className='text-xs font-medium text-gray-500 mb-0.5'>
            No Work Order
          </p>
          <p className='text-[10px] text-gray-400 max-w-[140px]'>
            This proposal doesn't have a linked work order yet
          </p>
        </div>
      )}
    </div>
  );
};

const ProposalCardSkeleton = () => (
  <div className='rounded-xl border border-gray-100 bg-white p-3 sm:p-5 animate-pulse'>
    <div className='flex flex-col md:flex-row items-stretch gap-4'>
      <div className='flex-1 space-y-3'>
        <div className='flex items-center gap-2'>
          <div className='h-5 w-20 bg-gray-200 rounded' />
          <div className='h-5 w-16 bg-gray-200 rounded-full' />
        </div>
        <div className='h-4 w-3/4 bg-gray-200 rounded' />
        <div className='flex gap-2'>
          <div className='h-12 flex-1 bg-gray-100 rounded-lg' />
          <div className='h-12 flex-1 bg-gray-100 rounded-lg' />
        </div>
        <div className='h-3 w-1/2 bg-gray-200 rounded' />
      </div>

      <div className='flex items-center justify-center md:w-10'>
        <div className='h-8 w-8 bg-gray-200 rounded-full' />
      </div>

      <div className='flex-1 space-y-3'>
        <div className='flex items-center gap-2'>
          <div className='h-5 w-16 bg-gray-200 rounded' />
          <div className='h-5 w-14 bg-gray-200 rounded-full' />
        </div>
        <div className='h-4 w-2/3 bg-gray-200 rounded' />
        <div className='flex gap-2'>
          <div className='h-10 flex-1 bg-gray-100 rounded-lg' />
          <div className='h-10 flex-1 bg-gray-100 rounded-lg' />
          <div className='h-10 flex-1 bg-gray-100 rounded-lg' />
        </div>
      </div>
    </div>
  </div>
);

const ProposalWODetailsDialog = ({ clientId }: Props) => {
  const { getParam, setParam, setParams, deleteParam, deleteParams } =
    useHandleParams();
  const router = useRouter();
  const isOpen = getParam("dialog") === "proposal-wo";
  const isFull = getParam("window") === "full";

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
  const totalPages = pagination?.totalPages ?? 0;
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

  return (
    <DialogWindow
      open={isOpen}
      setOpen={() => deleteParams(["dialog", "window"])}
      size='2xl'
      heightFull={true}
      title='Proposals & Work Orders'
      description={`Viewing all proposals${total > 0 ? ` · ${total} total` : ""}`}
      isFullScreen={isFull}
      onToggleFullScreen={() =>
        isFull ? deleteParam("window") : setParam("window", "full")
      }>
      <div className='flex flex-col h-full'>
        <div className='shrink-0 mb-5'>
          <div className='relative'>
            <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='Search by proposal code or title…'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400
                placeholder:text-gray-400 transition-all duration-200'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className='absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors'>
                <XCircle className='h-4 w-4' />
              </button>
            )}
          </div>
        </div>

        <div className='flex-1 min-h-0 overflow-y-auto space-y-4 pr-1'>
          {isLoading ? (
            <div className='space-y-4'>
              {Array.from({ length: 3 }).map((_, i) => (
                <ProposalCardSkeleton key={i} />
              ))}
            </div>
          ) : allProposals.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-full py-16'>
              <div className='p-4 rounded-2xl bg-linear-to-br from-gray-100 to-gray-50 text-gray-400 mb-5 shadow-sm'>
                <FileText className='w-8 h-8' />
              </div>
              <h3 className='text-base font-semibold text-gray-800 mb-1'>
                {debouncedSearch ? "No results found" : "No proposals yet"}
              </h3>
              <p className='text-sm text-gray-500 text-center max-w-xs'>
                {debouncedSearch
                  ? `No proposals matching "${debouncedSearch}". Try a different search.`
                  : "Create your first proposal to get started."}
              </p>
            </div>
          ) : (
            allProposals.map(({ proposal, workOrder }: any, index: number) => {
              const proposalStatus = getStatusConfig(proposal.status);
              const ProposalStatusIcon = proposalStatus.icon;

              return (
                <div
                  key={proposal.id}
                  className={`group rounded-md border bg-gray-100/50 shadow-sm hover:shadow-md
                    transition-all duration-300
                    ${isFetching && !isLoading ? "opacity-60" : "opacity-100"}`}>
                  <div className='p-3 sm:p-5'>
                    <div className='grid grid-cols-1 md:grid-cols-[1fr_48px_1fr] items-stretch gap-0'>
                      <div
                        className='md:pr-3 cursor-pointer rounded hover:bg-sky-50/50 transition-colors duration-200 -m-1 p-1'
                        onClick={() => {
                          deleteParams(["dialog", "window"]);
                          setTimeout(() => {
                            setParams({
                              dialog: "proposal-detail",
                              "proposal-id": proposal.id.toString(),
                            });
                          }, 100);
                        }}
                        title='View proposal details'>
                        <span className='inline-flex mb-2.5 items-center px-2 py-0.5 rounded bg-sky-50 text-sky-700 text-[11px] font-mono font-medium ring-1 ring-sky-200'>
                          <Hash className='w-3 h-3 mr-1 opacity-60' />
                          {proposal.code}
                        </span>

                        <h4 className='text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2'>
                          {capitalFirstLetter(proposal.title)}
                        </h4>

                        <div className='grid grid-cols-2 gap-2 mb-3'>
                          <div className='flex items-center gap-2 rounded-lg border bg-white border-gray-200/70 px-2.5 py-2'>
                            <div className='min-w-0'>
                              <div className='text-[9px] uppercase tracking-wider text-gray-400 font-medium'>
                                Submitted
                              </div>
                              <div className='text-xs font-medium text-gray-800 truncate'>
                                {formatDate(proposal.proposal_submission_date)}
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center gap-2 rounded-lg border bg-white border-gray-200/70 px-2.5 py-2'>
                            <div className='min-w-0'>
                              <div className='text-[9px] uppercase tracking-wider text-gray-400 font-medium'>
                                Created
                              </div>
                              <div className='text-xs font-medium text-gray-800 truncate'>
                                {formatDate(proposal.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center gap-3'>
                          {proposal.document_key && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(proposal.document_key, "_blank");
                              }}
                              className='inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 transition-colors'>
                              <ExternalLink className='w-3 h-3' />
                              Document
                            </button>
                          )}
                        </div>
                      </div>

                      <div className='relative flex items-center justify-center py-3 md:py-0'>
                        <div className='absolute inset-0 flex items-center justify-center'>
                          <div className='w-full h-px md:h-full md:w-px border-t md:border-t-0 md:border-l border-dashed border-gray-300' />
                        </div>
                        <div
                          className={`relative z-10 inline-flex items-center justify-center rounded-full border-2 bg-white p-2 shadow-sm transition-transform duration-200 group-hover:scale-110 ${
                            workOrder
                              ? "border-emerald-200 text-emerald-600"
                              : "border-gray-200 text-gray-400"
                          }`}
                          title={
                            workOrder
                              ? "Linked with Work Order"
                              : "No Work Order linked"
                          }>
                          {workOrder ? (
                            <Check className='w-4 h-4' />
                          ) : (
                            <Link2Off className='w-4 h-4' />
                          )}
                        </div>
                      </div>

                      <ResolvedWorkOrderSide workOrder={workOrder} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {total > 0 && (
          <div className='shrink-0 pt-4 mt-4 border-t border-gray-100'>
            <div className='flex items-center justify-between text-xs text-gray-500 mb-2'>
              <span>
                Showing{" "}
                <span className='font-medium text-gray-700'>
                  {allProposals.length}
                </span>{" "}
                of <span className='font-medium text-gray-700'>{total}</span>{" "}
                proposals
              </span>
              {totalPages > 1 && (
                <span>
                  Page <span className='font-medium text-gray-700'>{page}</span>{" "}
                  of{" "}
                  <span className='font-medium text-gray-700'>
                    {totalPages}
                  </span>
                </span>
              )}
            </div>
            {pagination?.hasMore && (
              <LoadMoreBtn
                onClick={handleLoadMore}
                loading={isFetching && !isLoading}
              />
            )}
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `,
        }}
      />
    </DialogWindow>
  );
};

export default ProposalWODetailsDialog;

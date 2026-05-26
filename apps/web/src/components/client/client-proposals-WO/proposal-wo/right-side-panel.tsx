"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { capitalFirstLetter } from "@pkg/utils";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  FileCode,
  Beaker,
  Shovel,
  AlignEndHorizontal,
  ArrowRight,
} from "lucide-react";

import { useHandleParams } from "@/hooks/useHandleParams";
import CustomButton from "@/components/shared/btn";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";

type WorkOrder = {
  id: number;
  code: string;
  title: string;
  status: string;
  process_type: string;
  start_date: string;
  end_date: string;
  agreement_number: string;
  handing_over_date: string;
  [key: string]: any;
};

type ProposalWithWO = {
  proposal: any;
  workOrder: WorkOrder | null;
};

interface Props {
  proposals: ProposalWithWO[];
}

type TabKey = "ongoing" | "completed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getStatusConfig = (status: string) => {
  switch (status) {
    case "completed":
      return {
        icon: CheckCircle2,
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-emerald-200",
      };
    case "cancelled":
      return {
        icon: XCircle,
        bg: "bg-red-50",
        text: "text-red-700",
        ring: "ring-red-200",
      };
    default:
      return {
        icon: AlertCircle,
        bg: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-amber-200",
      };
  }
};

const getProcessIcon = (type: string) => {
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

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

// ─── Mini WO Card ─────────────────────────────────────────────────────────────

const MiniWOCard = ({ wo }: { wo: WorkOrder }) => {
  const router = useRouter();
  const statusConfig = getStatusConfig(wo.status);
  const StatusIcon = statusConfig.icon;
  const processConfig = getProcessIcon(wo.process_type);

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => router.push(`/dashboard/client/workorder/${wo.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/dashboard/client/workorder/${wo.id}`);
        }
      }}
      className='group relative cursor-pointer border hover:shadow-sm  bg-gray-100/50 hover:border-green-400 overflow-hidden rounded-lg p-3.5 transition-all duration-200
        hover:-translate-y-px 
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2'>
      {/* Header: code + status */}
      <div className='flex items-start justify-between gap-2 mb-2.5'>
        <div className='min-w-0'>
          <span className='inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 ring-1 ring-emerald-200'>
            {wo.code}
          </span>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text} ring-1 ${statusConfig.ring}`}>
          <StatusIcon className='w-3 h-3' />
          {capitalFirstLetter(wo.status)}
        </span>
      </div>

      {/* Title */}
      <h4 className='text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2 mb-2 group-hover:text-emerald-700 transition-colors'>
        {wo.title ? capitalFirstLetter(wo.title) : "Untitled Work Order"}
      </h4>

      {/* Meta row */}
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]'>
        <div className='inline-flex items-center gap-1.5 rounded-md bg-gray-50 py-1 ring-1 ring-gray-100'>
          <span className={`font-medium ${processConfig.color}`}>
            {processConfig.label}
          </span>
        </div>

        <div className='flex items-center gap-2 text-gray-500'>
          <div className='flex items-center gap-1'>
            <Calendar className='w-3.5 h-3.5 text-gray-400' />
            <span className='font-medium text-gray-600'>
              {formatDate(wo.start_date)}
            </span>
          </div>
          <span className='text-gray-500'>→</span>
          <div className='flex items-center gap-1'>
            <span className='font-medium text-gray-600'>
              {formatDate(wo.end_date)}
            </span>
          </div>
        </div>
      </div>

      {/* Hover arrow */}
      <div className='absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity'>
        <div className='flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100'>
          <ArrowRight className='w-3.5 h-3.5 text-emerald-700' />
        </div>
      </div>
    </div>
  );
};

const ResolvedMiniWOCard = ({
  wo,
  onResolvedStatus,
}: {
  wo: WorkOrder;
  onResolvedStatus: (id: number, status: string) => void;
}) => {
  const { data } = trpc.workOrderQuery.getWorkOrderDetails.useQuery(
    { id: Number(wo.id) },
    { enabled: !!wo.id },
  );

  const resolvedStatus = useMemo(() => {
    const details = data;
    if (!details?.workOrder) return wo.status;
    if (details.workOrder.status === "cancelled") return "cancelled";

    const scheduleOfRates = details.scheduleOfRates || [];
    const sites = details.sites || [];
    if (scheduleOfRates.length === 0)
      return details.workOrder.status || wo.status;

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
  }, [data, wo.id, wo.status]);

  useEffect(() => {
    onResolvedStatus(wo.id, resolvedStatus);
  }, [wo.id, resolvedStatus, onResolvedStatus]);

  return <MiniWOCard wo={{ ...wo, status: resolvedStatus }} />;
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

const RightSidePanel = ({ proposals }: Props) => {
  const { setParam } = useHandleParams();
  const [activeTab, setActiveTab] = useState<TabKey>("ongoing");
  const [resolvedStatusById, setResolvedStatusById] = useState<
    Record<number, string>
  >({});

  // Derive work orders from proposals
  const allWorkOrders = proposals
    .filter((p) => p.workOrder !== null)
    .map((p) => p.workOrder as WorkOrder);

  const statusFor = (wo: WorkOrder) => resolvedStatusById[wo.id] ?? wo.status;

  const ongoingWOs = allWorkOrders.filter((wo) => statusFor(wo) === "pending");
  const completedWOs = allWorkOrders.filter(
    (wo) => statusFor(wo) === "completed",
  );

  const handleResolvedStatus = (id: number, status: string) => {
    setResolvedStatusById((prev) =>
      prev[id] === status ? prev : { ...prev, [id]: status },
    );
  };

  const tabs: {
    key: TabKey;
    label: string;
    count: number;
    color: string;
  }[] = [
    {
      key: "ongoing",
      label: "Ongoing",
      count: ongoingWOs.length,
      color: "amber",
    },
    {
      key: "completed",
      label: "Completed",
      count: completedWOs.length,
      color: "emerald",
    },
  ];

  const activeWOs = activeTab === "ongoing" ? ongoingWOs : completedWOs;

  return (
    <div className='w-full lg:w-4/12 bg-linear-to-br from-white to-gray-50 shadow-sm px-0.5 rounded-xl border flex flex-col'>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className='px-4 py-2'>
        <div className='flex items-center justify-between mb-2'>
          <div className='flex ml-2 items-center gap-2'>
            <h3 className='text-sm font-semibold text-gray-900'>Work Orders</h3>
          </div>
          <CustomButton
            type='button'
            variant='arrow'
            arrowType='upright'
            onClick={() => setParam("dialog", "client-wo-stats")}
          />
          {/* <button 
            title="View spending stats"
            onClick={() => setParam("dialog", "client-wo-stats")}
            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
          >
            <AlignEndHorizontal className="w-4 h-4" />
          </button> */}
        </div>

        {/* ─── Tab Toggle ───────────────────────────────────────── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabKey)}
          className='w-full'>
          <TabsList className='w-full flex rounded-lg bg-gray-100 p-1 h-auto'>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className='flex-1 flex items-center justify-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-gray-800 data-[state=active]:shadow-sm text-gray-500 hover:text-gray-700'>
                  {tab.label}
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold ${
                      isActive
                        ? tab.color === "amber"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-600"
                    }`}>
                    {tab.count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* ─── Content ────────────────────────────────────────────── */}
      <div className='flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-2'>
        {activeWOs.length > 0 ? (
          <div className='space-y-3'>
            {activeWOs.map((wo) => (
              <ResolvedMiniWOCard
                key={wo.id}
                wo={wo}
                onResolvedStatus={handleResolvedStatus}
              />
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center text-center py-10'>
            <div className='p-3 rounded-xl bg-linear-to-br from-gray-100 to-gray-50 text-gray-400 mb-4 shadow-sm'>
              {activeTab === "ongoing" ? (
                <Clock className='w-6 h-6' />
              ) : (
                <CheckCircle2 className='w-6 h-6' />
              )}
            </div>
            <p className='text-sm font-medium text-gray-600 mb-1'>
              {activeTab === "ongoing"
                ? "No ongoing work orders"
                : "No completed work orders"}
            </p>
            <p className='text-xs text-gray-400 max-w-[180px]'>
              {activeTab === "ongoing"
                ? "All work orders are either completed or not yet created."
                : "Work orders will appear here once they are marked as completed."}
            </p>
          </div>
        )}
      </div>

      {/* ─── Summary Footer ─────────────────────────────────────── */}
      {allWorkOrders.length > 0 && (
        <div className='shrink-0 mx-4 mb-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100'>
          <div className='flex items-center justify-between text-[10px] text-gray-500'>
            <div className='flex items-center gap-3'>
              <span className='flex items-center gap-1'>
                <span className='inline-block w-2 h-2 rounded-full bg-amber-400' />
                {ongoingWOs.length} Ongoing
              </span>
              <span className='flex items-center gap-1'>
                <span className='inline-block w-2 h-2 rounded-full bg-emerald-400' />
                {completedWOs.length} Done
              </span>
            </div>
            <span className='font-medium text-gray-600'>
              {allWorkOrders.length} Total
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightSidePanel;

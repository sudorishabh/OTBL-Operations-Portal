import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/shared/btn";
import { capitalFirstLetter } from "@pkg/utils";
import {
  Briefcase,
  Clock,
  FileText,
  Plus,
  Calendar,
  CalendarCheck,
  FileCode,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Beaker,
  Leaf,
  Sparkles,
  AlignEndHorizontal,
  Shovel,
  File,
} from "lucide-react";
import useHandleParams from "@/hooks/useHandleParams";
import { type workOrderTypes } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useIsAdmin } from "@/contexts/AuthContext";

interface Props {
  workOrder: workOrderTypes.workOrderType | null;
  proposalId: number;
  proposalTitle: string;
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

const getStatusConfig = (status: string) => {
  switch (status) {
    case "completed":
      return {
        icon: CheckCircle2,
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        ringColor: "ring-emerald-200",
      };
    case "cancelled":
      return {
        icon: XCircle,
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        ringColor: "ring-red-200",
      };
    default:
      return {
        icon: AlertCircle,
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        ringColor: "ring-amber-200",
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

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const WordOrderCard = ({ workOrder, proposalId, proposalTitle }: Props) => {
  const { setParams } = useHandleParams();
  const router = useRouter();
  const isAdmin = useIsAdmin();

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

  const statusConfig =
    workOrder && resolvedStatus ? getStatusConfig(resolvedStatus) : null;
  const processConfig = workOrder
    ? getProcessTypeConfig(workOrder.process_type)
    : null;
  const StatusIcon = statusConfig?.icon;

  return (
    <>
      <div className='w-full min-w-0 rounded-lg border hover:shadow-sm transition-shadow p-3 sm:p-4 flex flex-col min-h-36 sm:min-h-52 bg-gray-100/50 cursor-pointer hover:border-green-400'>
        {workOrder ? (
          <div
            className='group cursor-pointer flex flex-col h-full'
            onClick={() =>
              router.push(`/dashboard/client/workorder/${workOrder.id}`)
            }>
            <div className='flex items-start justify-between mb-1.5 sm:mb-2'>
              <div className='flex flex-wrap items-center gap-1.5 sm:gap-2'>
                <div className='inline-flex items-center px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 text-[11px] font-mono ring-1 ring-emerald-200'>
                  {workOrder.code}
                </div>
                {statusConfig && StatusIcon && (
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConfig.bgColor} ${statusConfig.textColor} ring-1 ${statusConfig.ringColor}`}>
                    <StatusIcon className='w-3 h-3' />
                    {capitalFirstLetter(resolvedStatus || workOrder.status)}
                  </div>
                )}
              </div>
              <div className='flex items-center gap-1.5 sm:gap-2'>
                {workOrder?.document_key && (
                  <button
                    type='button'
                    className='h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white border flex items-center justify-center transition-colors hover:bg-emerald-50 cursor-pointer'
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(workOrder.document_key, "_blank");
                    }}>
                    <File className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-700' />
                  </button>
                )}
                <CustomButton
                  text='View'
                  arrowType='right'
                  variant='arrow'
                  className='group-hover:text-white group-hover:bg-emerald-600 transition-colors'
                />
              </div>
            </div>

            <h3 className='text-xs sm:text-sm font-semibold leading-snug text-gray-600 line-clamp-2 break-all min-w-0 mb-1.5 sm:mb-2'>
              {workOrder.title
                ? capitalFirstLetter(workOrder.title)
                : "Untitled Work Order"}
            </h3>

            {processConfig && (
              <div className='flex items-center gap-1.5 mb-1.5 sm:mb-2'>
                <span className={`text-[11px] sm:text-xs font-medium ${processConfig.color}`}>
                  {processConfig.label}
                </span>
              </div>
            )}

            <div className='grid grid-cols-3 gap-1.5 sm:gap-2 mb-1.5 sm:mb-2'>
              <div className='flex items-center rounded-md bg-white border border-gray-200/70 px-1.5 sm:px-2 py-1 sm:py-1.5'>
                <div className='min-w-0'>
                  <div className='text-[9px] uppercase tracking-wider text-gray-500'>
                    Start
                  </div>
                  <div className='text-[10px] sm:text-[11px] font-medium text-gray-800 truncate'>
                    {formatDate(workOrder.start_date)}
                  </div>
                </div>
              </div>
              <div className='flex items-center rounded-md bg-white border border-gray-200/70 px-1.5 sm:px-2 py-1 sm:py-1.5'>
                <div className='min-w-0'>
                  <div className='text-[9px] uppercase tracking-wider text-gray-500'>
                    End
                  </div>
                  <div className='text-[10px] sm:text-[11px] font-medium text-gray-800 truncate'>
                    {formatDate(workOrder.end_date)}
                  </div>
                </div>
              </div>
              <div className='flex items-center rounded-md bg-white border border-gray-200/70 px-1.5 sm:px-2 py-1 sm:py-1.5'>
                <div className='min-w-0'>
                  <div className='text-[9px] uppercase tracking-wider text-gray-500'>
                    Handover
                  </div>
                  <div className='text-[10px] sm:text-[11px] font-medium text-gray-800 truncate'>
                    {formatDate(workOrder.handing_over_date)}
                  </div>
                </div>
              </div>
            </div>

            <p className='text-[11px] sm:text-xs text-gray-600 leading-relaxed line-clamp-2 mb-1.5 sm:mb-2 flex-1'>
              {capitalFirstLetter(workOrder?.description || "") ||
                "No description provided."}
            </p>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center text-center h-full'>
            <div className='p-3 rounded-xl bg-linear-to-br from-gray-100 to-gray-50 text-gray-500 mb-4 shadow-sm'>
              <Briefcase className='w-6 h-6' />
            </div>
            <p className='text-sm font-semibold text-gray-700 mb-1'>
              No Work Order
            </p>
            <p className='text-xs text-gray-500 mb-5 max-w-[180px]'>
              {isAdmin
                ? "Create a work order to link with this proposal and start tracking progress."
                : "No work order has been linked to this proposal yet."}
            </p>
            {isAdmin && (
              <CustomButton
                Icon={Plus}
                text='Create Work Order'
                onClick={() => {
                  setParams({
                    dialog: "create-workorder",
                    "proposal-id": proposalId.toString(),
                  });
                }}
                variant='outline'
                className='hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default WordOrderCard;

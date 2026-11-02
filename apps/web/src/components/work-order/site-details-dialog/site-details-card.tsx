import { Badge } from "@/components/ui/badge";
import React from "react";
import {
  Calendar,
  MapPin,
  FolderOpen,
  ChevronRight,
} from "lucide-react";

import { capitalFirstLetter, constants } from "@pkg/utils";
import { format } from "date-fns";
import { useIsAdmin } from "@/contexts/AuthContext";
import WoSiteOperatorsSection from "./wo-site-operators-section";
import EditSiteDatesDialog from "./edit-site-dates-dialog";
import { MobilizationCertificate, ZeroDaySample } from "./site-mobilization";

interface WorkOrderSiteDetails {
  id: number;
  end_date: string;
  status: "pending" | "completed" | "cancelled";
  is_completed?: boolean;
  client_id: number;
  work_order_id: number;
  site_id: number;
  date: string;
  process_type: string;
  created_at: string;
  updated_at: string;
  site: {
    id: number;
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  work_order: {
    id: number;
    code: string | null;
    title: string | null;
    process_type: string | null;
  };
  activities:
    | {
        id: number;
        work_order_site_id: number;
        created_at: string;
        updated_at: string;
        activity: string;
      }[]
    | undefined;
}

interface Props {
  siteDetails: WorkOrderSiteDetails | undefined | null;
  operatorUploadsCount?: number;
  onOpenOperatorUploads?: () => void;
}

const SiteDetailsCard = ({
  siteDetails,
  operatorUploadsCount = 0,
  onOpenOperatorUploads,
}: Props) => {
  const isAdmin = useIsAdmin();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "cancelled":
        return "bg-red-50 text-red-600 border-red-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const formatDate = (value: string | undefined) =>
    value ? format(new Date(value), "dd MMM yyyy") : "N/A";
  const address = [
    siteDetails?.site?.address,
    siteDetails?.site?.city,
    siteDetails?.site?.state,
  ]
    .map((part) => part ?? "N/A")
    .join(", ");
  // A bioremediation site completes once its TPH drops below the target.
  const status = siteDetails?.is_completed
    ? "completed"
    : (siteDetails?.status ?? "pending");

  return (
    <div className='bg-linear-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border'>
      <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-2'>
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-700'>
          <h3 className='text-xs font-medium text-gray-500 uppercase tracking-wide'>
            Site Information
          </h3>
          <span className='inline-flex items-center gap-1.5 whitespace-nowrap font-medium'>
            <Calendar className='w-3.5 h-3.5 text-gray-400' />
            {formatDate(siteDetails?.date)}
            <span className='text-gray-400'>→</span>
            {formatDate(siteDetails?.end_date)}
            {isAdmin && siteDetails && (
              <EditSiteDatesDialog
                woSiteId={siteDetails.id}
                date={siteDetails.date}
                endDate={siteDetails.end_date}
              />
            )}
          </span>
          <span
            className='inline-flex min-w-0 max-w-full items-center gap-1.5'
            title={address}>
            <MapPin className='w-3.5 h-3.5 shrink-0 text-gray-400' />
            <span className='truncate'>{address}</span>
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {operatorUploadsCount > 0 && onOpenOperatorUploads && (
            <button
              type='button'
              onClick={onOpenOperatorUploads}
              title='View operator uploads'
              className='group inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700 shadow-xs cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-sm active:scale-[0.98] transition-all'>
              <FolderOpen className='size-3' />
              <span>
                {operatorUploadsCount} operator{" "}
                {operatorUploadsCount === 1 ? "upload" : "uploads"}
              </span>
              <ChevronRight className='size-3 -mr-0.5 transition-transform group-hover:translate-x-0.5' />
            </button>
          )}
          <Badge
            className={`text-[10px] border ${getStatusColor(status)}`}>
            {capitalFirstLetter(status)}
          </Badge>
        </div>
      </div>

      {siteDetails?.id && (
        <div className='mt-4'>
          <WoSiteOperatorsSection woSiteId={siteDetails.id} />
        </div>
      )}

      {/* How the site was set up: the team moving on, and the baseline
          sample taken before treatment starts. */}
      {siteDetails?.id &&
        siteDetails.process_type === constants.WO_PROCESS.BIOREMEDIATION && (
          <div className='mt-4 grid grid-cols-1 gap-5 border-t border-gray-200/50 pt-4 md:grid-cols-2'>
            <div className='min-w-0'>
              <MobilizationCertificate woSiteId={siteDetails.id} />
            </div>
            <div className='min-w-0'>
              <ZeroDaySample woSiteId={siteDetails.id} />
            </div>
          </div>
        )}
    </div>
  );
};

export default SiteDetailsCard;

import React from "react";
import { CalendarDays, ChevronRight, FolderOpen, MapPin } from "lucide-react";

import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";
import { formatDateRange, scheduleNote } from "@/lib/wo-site-display";
import { useIsAdmin } from "@/contexts/AuthContext";
import WoSiteOperatorsSection from "./wo-site-operators-section";
import EditSiteDatesDialog from "./edit-site-dates-dialog";
import SiteEstimate from "./site-estimate";
import { MobilizationCertificate, ZeroDaySample } from "./site-mobilization";
import SiteMeasurementSheets from "./site-measurement-sheets";
import SiteCompletionCertificate from "./site-completion-certificate";

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

// Matches the site cards on the work order page.
const STATUS_STYLES: Record<
  WorkOrderSiteDetails["status"],
  { label: string; pill: string }
> = {
  pending: {
    label: "Pending",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  completed: {
    label: "Complete",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

const SiteDetailsCard = ({
  siteDetails,
  operatorUploadsCount = 0,
  onOpenOperatorUploads,
}: Props) => {
  const isAdmin = useIsAdmin();

  const address = [
    siteDetails?.site?.address,
    siteDetails?.site?.city,
    siteDetails?.site?.state,
  ]
    .filter(Boolean)
    .join(", ");
  // A bioremediation site completes once its TPH drops below the target.
  const status = siteDetails?.is_completed
    ? "completed"
    : (siteDetails?.status ?? "pending");
  const note = scheduleNote(status, siteDetails?.date, siteDetails?.end_date);
  const isBioremediation =
    siteDetails?.process_type === constants.WO_PROCESS.BIOREMEDIATION;
  const isCompleted = !!siteDetails?.is_completed;
  // Mobilization and the 0-day sample, the sheets, then the certificate.
  const documentCount = (isBioremediation ? 2 : 0) + 1 + (isCompleted ? 1 : 0);

  return (
    <section className='rounded-lg border border-gray-200 bg-white'>
      <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-sm font-semibold text-gray-900'>
              Site information
            </h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                STATUS_STYLES[status].pill,
              )}>
              {STATUS_STYLES[status].label}
            </span>
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
            <span className='inline-flex items-center gap-1.5 whitespace-nowrap'>
              <CalendarDays className='size-3.5 text-gray-400' />
              {formatDateRange(siteDetails?.date, siteDetails?.end_date)}
              {isAdmin && siteDetails && (
                <EditSiteDatesDialog
                  woSiteId={siteDetails.id}
                  date={siteDetails.date}
                  endDate={siteDetails.end_date}
                />
              )}
            </span>
            {note && <span className={note.tone}>{note.text}</span>}
            <span
              className='inline-flex min-w-0 max-w-full items-center gap-1.5'
              title={address || undefined}>
              <MapPin className='size-3.5 shrink-0 text-gray-400' />
              <span className='truncate'>{address || "No address"}</span>
            </span>
          </div>
        </div>
        {operatorUploadsCount > 0 && onOpenOperatorUploads && (
          <button
            type='button'
            onClick={onOpenOperatorUploads}
            title='View operator uploads'
            className='group inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
            <FolderOpen className='size-3.5 text-gray-400' />
            {operatorUploadsCount} operator{" "}
            {operatorUploadsCount === 1 ? "upload" : "uploads"}
            <ChevronRight className='-mr-0.5 size-3.5 text-gray-400 transition-transform group-hover:translate-x-0.5' />
          </button>
        )}
      </div>

      {siteDetails?.id && (
        <WoSiteOperatorsSection
          woSiteId={siteDetails.id}
          className='border-t border-gray-100 px-5 py-4'
        />
      )}

      {/* What the site is estimated to take, which sets its share of the
          work order's schedule of rates. */}
      {siteDetails?.id && (
        <SiteEstimate
          woSiteId={siteDetails.id}
          processType={siteDetails.process_type}
          className='border-t border-gray-100 px-5 py-4'
        />
      )}

      {/* The site's documents. For bioremediation, how it was set up: the
          team moving on, and the baseline sample taken before treatment
          starts. Then the measurements behind its quantities, and the
          certificate, only taken once the site is complete. */}
      {siteDetails?.id && (
        <div
          className={cn(
            "grid grid-cols-1 gap-x-6 gap-y-5 border-t border-gray-100 px-5 py-4",
            documentCount >= 2 && "md:grid-cols-2",
            documentCount === 3 && "xl:grid-cols-3",
            documentCount >= 4 && "xl:grid-cols-4",
          )}>
          {isBioremediation && (
            <>
              <div className='min-w-0'>
                <MobilizationCertificate woSiteId={siteDetails.id} />
              </div>
              <div className='min-w-0'>
                <ZeroDaySample woSiteId={siteDetails.id} />
              </div>
            </>
          )}
          <div className='min-w-0'>
            <SiteMeasurementSheets woSiteId={siteDetails.id} />
          </div>
          {isCompleted && (
            <div className='min-w-0'>
              <SiteCompletionCertificate woSiteId={siteDetails.id} />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default SiteDetailsCard;

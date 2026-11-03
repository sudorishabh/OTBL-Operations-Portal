import React from "react";
import { ChevronRight, FolderOpen } from "lucide-react";

import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";
import { formatDateRange, scheduleNote } from "@/lib/wo-site-display";
import { useIsAdmin } from "@/contexts/AuthContext";
import WoSiteOperatorsSection from "./wo-site-operators-section";
import EditSiteDatesDialog from "./edit-site-dates-dialog";
import SiteEstimate from "./site-estimate";
import { MobilizationCertificate, ZeroDaySample } from "./site-mobilization";
import SiteMeasurementSheets from "./site-measurement-sheets";
import SiteCompletionCertificate, {
  PendingCompletionCertificate,
} from "./site-completion-certificate";
import InfoSection from "./info-section";

const { TPH_TARGET, WO_PROCESS, processTypeOptions } = constants;

// The documents of one card row, two to a row once there is room.
const DOCUMENTS_GRID = "grid grid-cols-1 gap-x-6 gap-y-5 @2xl:grid-cols-2";

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

// One of the site's facts in the card's header: a small label over its value.
const Fact = ({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: React.ReactNode;
}) => (
  <div
    className='min-w-0'
    title={title}>
    <dt className='text-[11px] text-gray-400'>{label}</dt>
    <dd className='mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-gray-800'>
      {children}
    </dd>
  </div>
);

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
    siteDetails?.process_type === WO_PROCESS.BIOREMEDIATION;
  const isCompleted = !!siteDetails?.is_completed;
  const processLabel =
    processTypeOptions.find(
      (option) => option.value === siteDetails?.process_type,
    )?.label ?? "Not set";

  return (
    <section className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
      <div className='px-5 py-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
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

        {/* The first column is as wide as the rows' shaded one, so the facts
            after it line up with the rows' content. */}
        <dl className='mt-3 grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-[13.75rem_minmax(0,1fr)_minmax(0,1fr)]'>
          <Fact label='Schedule'>
            <span className='inline-flex items-center gap-1 whitespace-nowrap'>
              {formatDateRange(siteDetails?.date, siteDetails?.end_date)}
              {isAdmin && siteDetails && (
                <EditSiteDatesDialog
                  woSiteId={siteDetails.id}
                  date={siteDetails.date}
                  endDate={siteDetails.end_date}
                />
              )}
            </span>
            {note && (
              <span className={cn("whitespace-nowrap text-xs", note.tone)}>
                {note.text}
              </span>
            )}
          </Fact>
          <Fact
            label='Location'
            title={address || undefined}>
            <span className='min-w-0 truncate'>{address || "No address"}</span>
          </Fact>
          <Fact label='Process'>{processLabel}</Fact>
        </dl>
      </div>

      {siteDetails?.id && (
        <WoSiteOperatorsSection
          woSiteId={siteDetails.id}
          className='border-t border-gray-100'
        />
      )}

      {/* What the site is estimated to take, which sets its share of the
          work order's schedule of rates. */}
      {siteDetails?.id && (
        <SiteEstimate
          woSiteId={siteDetails.id}
          processType={siteDetails.process_type}
          className='border-t border-gray-100'
        />
      )}

      {/* How bioremediation was set up: the team moving on, and the
          baseline sample taken before treatment starts. */}
      {siteDetails?.id && isBioremediation && (
        <InfoSection
          title='Mobilization'
          description='Before treatment starts: the team moving onto the site, and the baseline sample.'
          className='border-t border-gray-100'>
          <div className={DOCUMENTS_GRID}>
            <div className='min-w-0'>
              <MobilizationCertificate woSiteId={siteDetails.id} />
            </div>
            <div className='min-w-0'>
              <ZeroDaySample woSiteId={siteDetails.id} />
            </div>
          </div>
        </InfoSection>
      )}

      {/* The measurements behind the site's quantities, and the certificate,
          only taken once the site is complete. */}
      {siteDetails?.id && (
        <InfoSection
          title='Completion'
          description='The measurements behind the quantities, then the signed certificate once the site is complete.'
          className='border-t border-gray-100'>
          <div className={DOCUMENTS_GRID}>
            <div className='min-w-0'>
              <SiteMeasurementSheets woSiteId={siteDetails.id} />
            </div>
            <div className='min-w-0'>
              {isCompleted ? (
                <SiteCompletionCertificate woSiteId={siteDetails.id} />
              ) : (
                <PendingCompletionCertificate
                  note={
                    isBioremediation
                      ? `Upload it once the site is complete, when its latest TPH is below ${TPH_TARGET}.`
                      : "Upload it once the site is complete."
                  }
                />
              )}
            </div>
          </div>
        </InfoSection>
      )}
    </section>
  );
};

export default SiteDetailsCard;

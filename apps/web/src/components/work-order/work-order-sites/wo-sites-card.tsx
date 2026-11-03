import React from "react";
import { capitalFirstLetter } from "@pkg/utils";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  MapPin,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateRange, scheduleNote } from "@/lib/wo-site-display";

interface Site {
  id: number;
  wo_site_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: "pending" | "completed" | "cancelled";
  start_date: string;
  end_date: string;
  created_at: string;
  users: { user_id: number; user_name: string }[];
  measurement_sheets?: { id: number; document_url: string }[];
}

interface Props {
  sites: Site[];
  handleSiteDetails: (siteId: string) => void;
}

const STATUS_STYLES: Record<Site["status"], { label: string; pill: string }> = {
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

const MAX_VISIBLE_OPERATORS = 3;
const MAX_VISIBLE_SHEETS = 3;

const formatDate = (value: string, pattern: string) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : format(date, pattern);
};

// One site: where it is, its dates, who works it, and its measurement
// sheets. The whole card opens the site.
const SiteCard = ({
  site,
  onOpen,
}: {
  site: Site;
  onOpen: () => void;
}) => {
  const status = STATUS_STYLES[site.status] ?? STATUS_STYLES.pending;
  const location = [site.address, site.city, site.state]
    .filter(Boolean)
    .join(", ");
  const operators = (site.users ?? []).map((user) =>
    capitalFirstLetter(user.user_name),
  );
  const hiddenOperators = operators.slice(MAX_VISIBLE_OPERATORS);
  const sheets = site.measurement_sheets ?? [];
  const note = scheduleNote(site.status, site.start_date, site.end_date);

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={`Open site ${site.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className='group flex h-full cursor-pointer flex-col rounded-lg border border-gray-200 bg-white outline-none transition-colors duration-200 hover:border-emerald-300 focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
      <div className='flex items-start gap-3 px-4 pt-4'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <h3
              className='truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-emerald-700'
              title={site.name}>
              {capitalFirstLetter(site.name)}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                status.pill,
              )}>
              {status.label}
            </span>
          </div>
          <p
            className='mt-1 flex min-w-0 items-center gap-1.5 text-xs text-gray-500'
            title={location}>
            <MapPin className='size-3.5 shrink-0 text-gray-400' />
            <span className='truncate'>{location || "No address"}</span>
          </p>
        </div>
        <ChevronRight className='mt-0.5 size-4 shrink-0 text-gray-300 transition-colors group-hover:text-emerald-600' />
      </div>

      <div className='flex-1 space-y-1.5 px-4 pb-4 pt-3 text-xs text-gray-600'>
        <p className='flex flex-wrap items-center gap-x-3 gap-y-0.5'>
          <span className='inline-flex items-center gap-1.5'>
            <CalendarDays className='size-3.5 text-gray-400' />
            {formatDateRange(site.start_date, site.end_date)}
          </span>
          {note && <span className={note.tone}>{note.text}</span>}
        </p>
        <p className='flex min-w-0 items-center gap-1.5'>
          <Users className='size-3.5 shrink-0 text-gray-400' />
          {operators.length > 0 ? (
            <span className='truncate'>
              {operators.slice(0, MAX_VISIBLE_OPERATORS).join(", ")}
              {hiddenOperators.length > 0 && (
                <span
                  className='text-gray-400'
                  title={hiddenOperators.join(", ")}>
                  {" "}
                  +{hiddenOperators.length}
                </span>
              )}
            </span>
          ) : (
            <span className='text-gray-400'>No operators yet</span>
          )}
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-b-lg border-t border-gray-100 bg-gray-50/60 px-4 py-2'>
        {sheets.slice(0, MAX_VISIBLE_SHEETS).map((sheet, idx) => (
          <a
            key={sheet.id}
            href={sheet.document_url}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(e) => e.stopPropagation()}
            className='inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
            <FileText className='size-3' />
            Sheet {idx + 1}
          </a>
        ))}
        {sheets.length > MAX_VISIBLE_SHEETS && (
          <span className='text-[11px] font-medium text-gray-400'>
            +{sheets.length - MAX_VISIBLE_SHEETS}
          </span>
        )}
        <span
          className='ml-auto shrink-0 text-[11px] text-gray-400'
          title={formatDate(site.created_at, "MMM dd, yyyy, hh:mm a")}>
          Added {formatDate(site.created_at, "d MMM yy")}
        </span>
      </div>
    </div>
  );
};

const WOSitesCard = ({ sites, handleSiteDetails }: Props) => {
  if (!sites || sites.length === 0) {
    return (
      <p className='py-10 text-center text-sm text-gray-500'>
        No sites to show.
      </p>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 xl:grid-cols-3'>
      {sites.map((site) => (
        <SiteCard
          key={site.wo_site_id + site.created_at}
          site={site}
          onOpen={() => handleSiteDetails(site.wo_site_id)}
        />
      ))}
    </div>
  );
};

export default WOSitesCard;

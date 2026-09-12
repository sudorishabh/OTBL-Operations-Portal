import React from "react";
import { capitalFirstLetter } from "@pkg/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

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

const STATUS_STYLES: Record<Site["status"], { chip: string; dot: string }> = {
  completed: { chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { chip: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  pending: { chip: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

const MAX_VISIBLE_OPERATORS = 3;
const MAX_VISIBLE_SHEETS = 3;

const formatDate = (value: string, pattern: string) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : format(date, pattern);
};

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
  const operators = site.users ?? [];
  const sheets = site.measurement_sheets ?? [];

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
      className='group flex h-full cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm outline-none transition-all duration-200 hover:border-emerald-300 hover:shadow-md focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
      {/* Identity */}
      <div className='flex items-start gap-2'>
        <span
          className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", status.dot)}
        />
        <div className='min-w-0 flex-1'>
          <h3
            className='truncate text-[13px] font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-emerald-700'
            title={site.name}>
            {capitalFirstLetter(site.name)}
          </h3>
          <p
            className='mt-0.5 truncate text-[11px] text-gray-400'
            title={location}>
            {location || "—"}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            status.chip,
          )}>
          {capitalFirstLetter(site.status)}
        </span>
        <ArrowRight className='mt-0.5 size-3.5 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-600' />
      </div>

      {/* Schedule + operators */}
      <div className='mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-gray-100 pt-3'>
        <div className='min-w-0'>
          <div className='text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
            Schedule
          </div>
          <div className='mt-0.5 whitespace-nowrap text-[12px] font-medium text-gray-700'>
            {formatDate(site.start_date, "dd MMM yy")}
            <span className='mx-1 text-gray-300'>&rarr;</span>
            {formatDate(site.end_date, "dd MMM yy")}
          </div>
        </div>

        <div className='min-w-0'>
          <div className='text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
            Operators
          </div>
          <div className='mt-0.5 flex flex-wrap items-center gap-1'>
            {operators.length > 0 ? (
              <>
                {operators.slice(0, MAX_VISIBLE_OPERATORS).map((user) => (
                  <Badge
                    key={user.user_id}
                    variant='outline'
                    className='max-w-[7.5rem] truncate bg-white px-1.5 py-0 text-[10px] font-medium text-gray-700'>
                    {capitalFirstLetter(user.user_name)}
                  </Badge>
                ))}
                {operators.length > MAX_VISIBLE_OPERATORS && (
                  <span
                    className='text-[10px] font-medium text-gray-400'
                    title={operators
                      .slice(MAX_VISIBLE_OPERATORS)
                      .map((u) => capitalFirstLetter(u.user_name))
                      .join(", ")}>
                    +{operators.length - MAX_VISIBLE_OPERATORS}
                  </span>
                )}
              </>
            ) : (
              <span className='text-[11px] text-gray-300'>Unassigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: sheets + creation time */}
      <div className='mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-gray-100 pt-2.5'>
        {sheets.length > 0 && (
          <>
            <FileText className='size-3 shrink-0 text-emerald-500' />
            {sheets.slice(0, MAX_VISIBLE_SHEETS).map((sheet, idx) => (
              <a
                key={sheet.id}
                href={sheet.document_url}
                target='_blank'
                rel='noopener noreferrer'
                onClick={(e) => e.stopPropagation()}
                className='inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
                <ExternalLink className='size-2.5' />
                Sheet {idx + 1}
              </a>
            ))}
            {sheets.length > MAX_VISIBLE_SHEETS && (
              <span className='text-[10px] font-medium text-gray-400'>
                +{sheets.length - MAX_VISIBLE_SHEETS}
              </span>
            )}
          </>
        )}
        <span
          className='ml-auto shrink-0 text-[10px] text-gray-400'
          title={formatDate(site.created_at, "MMM dd, yyyy • hh:mm a")}>
          Added {formatDate(site.created_at, "dd MMM yy")}
        </span>
      </div>
    </div>
  );
};

const WOSitesCard = ({ sites, handleSiteDetails }: Props) => {
  if (!sites || sites.length === 0) {
    return (
      <div className='py-10 text-center text-gray-500'>
        No sites found matching your criteria.
      </div>
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

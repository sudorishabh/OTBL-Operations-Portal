"use client";

import { Input } from "@/components/ui/input";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { capitalFirstLetter } from "@pkg/utils";
import { differenceInCalendarDays, format } from "date-fns";
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  LogOut,
  MapPin,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type AssignedSite =
  RouterOutputs["workOrderSiteQuery"]["getMyAssignedWorkOrderSites"][number];

type SiteStatus = "pending" | "completed" | "cancelled";

/** Rail + chip share the product's existing status colours (see wo-sites-card). */
const STATUS_STYLES: Record<SiteStatus, { rail: string; chip: string }> = {
  completed: { rail: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  cancelled: { rail: "bg-rose-400", chip: "bg-rose-50 text-rose-700" },
  pending: { rail: "bg-amber-400", chip: "bg-amber-50 text-amber-700" },
};

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/** Show search + filters only once the list is long enough to need them. */
const TOOLBAR_THRESHOLD = 5;

const toDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const statusOf = (site: AssignedSite): SiteStatus =>
  site.status === "completed" || site.status === "cancelled"
    ? site.status
    : "pending";

const isOpen = (site: AssignedSite) => statusOf(site) === "pending";

const formatRange = (site: AssignedSite) => {
  const start = toDate(site.start_date);
  const end = toDate(site.end_date);
  if (!start && !end) return "Not scheduled";
  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear();
    return `${format(start, sameYear ? "d MMM" : "d MMM yy")} – ${format(end, "d MMM yy")}`;
  }
  return format((start ?? end)!, "d MMM yy");
};

/** Plain-language urgency, only for sites that are still open. */
const scheduleNote = (site: AssignedSite) => {
  if (!isOpen(site)) return null;

  const start = toDate(site.start_date);
  const end = toDate(site.end_date);
  const today = new Date();

  if (start && differenceInCalendarDays(start, today) > 0) {
    const days = differenceInCalendarDays(start, today);
    return {
      text: days === 1 ? "Starts tomorrow" : `Starts in ${days} days`,
      tone: "text-gray-500",
    };
  }

  if (!end) return null;
  const days = differenceInCalendarDays(end, today);
  if (days < 0)
    return {
      text: days === -1 ? "Ended yesterday" : `Ended ${Math.abs(days)} days ago`,
      tone: "text-rose-600",
    };
  if (days === 0) return { text: "Ends today", tone: "text-rose-600" };
  if (days === 1) return { text: "Ends tomorrow", tone: "text-amber-600" };
  if (days <= 5) return { text: `${days} days left`, tone: "text-amber-600" };
  return { text: `${days} days left`, tone: "text-gray-500" };
};

/** Open sites first, soonest deadline first; closed sites fall to the bottom. */
const byUrgency = (a: AssignedSite, b: AssignedSite) => {
  if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;

  const aEnd = toDate(a.end_date)?.getTime();
  const bEnd = toDate(b.end_date)?.getTime();
  if (aEnd === bEnd) return a.site_name.localeCompare(b.site_name);
  if (aEnd === undefined) return 1;
  if (bEnd === undefined) return -1;
  return isOpen(a) ? aEnd - bEnd : bEnd - aEnd;
};

const SiteCard = ({ site }: { site: AssignedSite }) => {
  const status = statusOf(site);
  const styles = STATUS_STYLES[status];
  const note = scheduleNote(site);
  const location =
    [site.site_city, site.site_state].filter(Boolean).join(", ") ||
    site.site_address ||
    "Location not set";
  const hasUploads = site.uploads_count > 0;

  return (
    <Link
      href={`/dashboard/wo-site/${site.work_order_site_id}`}
      aria-label={`Open ${site.site_name}`}
      className='group flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-colors hover:border-emerald-300 focus-visible:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
      <span
        aria-hidden
        className={cn("w-1 shrink-0", styles.rail)}
      />

      <div className='min-w-0 flex-1 p-4'>
        <div className='flex items-start gap-2'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2 text-[12px] text-gray-500'>
              <span className='truncate font-medium tabular-nums'>
                {site.wo_code}
              </span>
              <span
                aria-hidden
                className='h-3 w-px shrink-0 bg-gray-200'
              />
              <span className='shrink-0 tabular-nums'>
                Job {site.job_number}
              </span>
            </div>

            <h2
              className='mt-1 truncate text-[15px] font-semibold tracking-tight text-gray-900 transition-colors group-hover:text-emerald-700'
              title={site.site_name}>
              {capitalFirstLetter(site.site_name)}
            </h2>

            {site.wo_title && (
              <p
                className='mt-0.5 truncate text-[12.5px] text-gray-400'
                title={site.wo_title}>
                {site.wo_title}
              </p>
            )}
          </div>

          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold",
              styles.chip,
            )}>
            {capitalFirstLetter(site.status)}
          </span>
          <ChevronRight className='mt-0.5 size-4 shrink-0 text-gray-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-600' />
        </div>

        <div className='mt-3.5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3.5'>
          <div className='min-w-0'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
              Location
            </div>
            <p
              className='mt-0.5 flex items-center gap-1 text-[13px] font-medium text-gray-700'
              title={location}>
              <MapPin className='size-3.5 shrink-0 text-gray-400' />
              <span className='truncate'>{location}</span>
            </p>
          </div>

          <div className='min-w-0'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
              Schedule
            </div>
            <p className='mt-0.5 whitespace-nowrap text-[13px] font-medium tabular-nums text-gray-700'>
              {formatRange(site)}
            </p>
            {note && (
              <p className={cn("text-[12px] font-medium", note.tone)}>
                {note.text}
              </p>
            )}
          </div>

          <div className='col-span-2'>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium",
                hasUploads
                  ? "bg-gray-50 text-gray-600"
                  : "bg-amber-50 text-amber-700",
              )}>
              {hasUploads ? (
                <CheckCircle2 className='size-3.5' />
              ) : (
                <FileText className='size-3.5' />
              )}
              {hasUploads
                ? `${site.uploads_count} ${site.uploads_count === 1 ? "document" : "documents"} uploaded`
                : "No documents uploaded yet"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const CardSkeleton = () => (
  <div className='flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
    <span className='w-1 shrink-0 bg-gray-200' />
    <div className='flex-1 animate-pulse space-y-2 p-4'>
      <div className='h-3 w-28 rounded bg-gray-100' />
      <div className='h-4 w-2/3 rounded bg-gray-200' />
      <div className='h-3 w-1/2 rounded bg-gray-100' />
      <div className='mt-3.5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3.5'>
        <div className='h-8 rounded bg-gray-100' />
        <div className='h-8 rounded bg-gray-100' />
      </div>
    </div>
  </div>
);

export default function OperatorAssignedSitesPage() {
  const { user, logout } = useAuthContext();
  const { data, isLoading } =
    trpc.workOrderSiteQuery.getMyAssignedWorkOrderSites.useQuery();

  const [filter, setFilter] = useState<FilterKey>("open");
  const [search, setSearch] = useState("");

  const sites = useMemo<AssignedSite[]>(
    () => [...(data ?? [])].sort(byUrgency),
    [data],
  );

  const counts = useMemo(
    () => ({
      all: sites.length,
      open: sites.filter(isOpen).length,
      closed: sites.filter((s) => !isOpen(s)).length,
    }),
    [sites],
  );

  const showToolbar = sites.length > TOOLBAR_THRESHOLD;

  const visible = useMemo(() => {
    if (!showToolbar) return sites;

    const term = search.trim().toLowerCase();
    return sites.filter((site) => {
      if (filter === "open" && !isOpen(site)) return false;
      if (filter === "closed" && isOpen(site)) return false;
      if (!term) return true;

      return [
        site.site_name,
        site.wo_code,
        site.wo_title,
        site.site_city,
        site.site_state,
        String(site.job_number),
      ].some((field) => field?.toLowerCase().includes(term));
    });
  }, [sites, filter, search, showToolbar]);

  const firstName = user?.name?.split(" ")[0];

  return (
    <div className='min-h-svh bg-gray-50'>
      <header className='bg-cyan-900 px-4 py-4 sm:px-6'>
        <div className='mx-auto flex max-w-4xl items-center justify-between gap-4'>
          <div className='flex min-w-0 items-center gap-3'>
            <Image
              src='/Otbl-logo_transparent.png'
              alt='OTBL'
              width={64}
              height={32}
              className='h-7 w-auto shrink-0 object-contain'
              loading='eager'
            />
            <div className='min-w-0'>
              <h1 className='truncate text-[15px] font-semibold text-white'>
                {firstName ? `Hi, ${firstName}` : "Your sites"}
              </h1>
              <p className='truncate text-[12.5px] text-cyan-100/80'>
                Open a site to upload measurement sheets, bills and photos.
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={() => void logout()}
            className='inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/20 px-2.5 text-[12.5px] font-medium text-cyan-50 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'>
            <LogOut className='size-3.5' />
            <span className='hidden sm:inline'>Log out</span>
          </button>
        </div>
      </header>

      {showToolbar && (
        <div className='sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6'>
          <div className='mx-auto flex max-w-4xl flex-wrap items-center gap-2'>
            <div className='flex items-center gap-1 rounded-lg bg-gray-100 p-0.5'>
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type='button'
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors",
                    filter === key
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-800",
                  )}>
                  {label}
                  <span className='ml-1.5 tabular-nums text-gray-400'>
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>

            <div className='relative min-w-48 flex-1'>
              <Search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400' />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search site, work order or job number'
                aria-label='Search assigned sites'
                className='h-8 border-gray-200 bg-white pl-8 pr-8 text-[13px] shadow-none placeholder:text-gray-400'
              />
              {search && (
                <button
                  type='button'
                  onClick={() => setSearch("")}
                  aria-label='Clear search'
                  className='absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-700'>
                  <X className='size-3.5' />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className='mx-auto w-full max-w-4xl px-4 py-5 sm:px-6'>
        {isLoading ? (
          <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className='rounded-xl border border-gray-200 bg-white px-6 py-14 text-center'>
            <MapPin className='mx-auto size-7 text-gray-300' />
            <p className='mt-3 text-[14px] font-semibold text-gray-900'>
              No sites assigned to you
            </p>
            <p className='mx-auto mt-1 max-w-sm text-[12.5px] text-gray-500'>
              Your office assigns you to a site when work is scheduled. This
              list updates on its own once that happens.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className='rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center'>
            <p className='text-[13.5px] font-medium text-gray-900'>
              {search.trim()
                ? `No sites match \u201C${search.trim()}\u201D`
                : `No ${filter} sites`}
            </p>
            <button
              type='button'
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className='mt-2 cursor-pointer text-[12.5px] font-medium text-emerald-700 underline-offset-2 hover:underline'>
              Show all sites
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
            {visible.map((site) => (
              <SiteCard
                key={site.work_order_site_id}
                site={site}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

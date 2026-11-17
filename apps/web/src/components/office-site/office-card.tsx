import React from "react";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  MapPinned,
  MoreVertical,
  Pencil,
  Plus,
  UserCog,
  Users,
} from "lucide-react";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import { Pill } from "@/components/shared/detail-card-parts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useHandleParams from "@/hooks/useHandleParams";
import type { RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export type OfficeListItem =
  RouterOutputs["officeQuery"]["getOffices"]["offices"][number];
type LatestSite = OfficeListItem["latestSites"][number];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-amber-50 text-amber-700 ring-amber-200",
};

// Phones show this many of the newest sites; wider screens show them all.
const PHONE_SITES = 3;

// Sites added within this many days are marked new.
const NEW_SITE_DAYS = 30;

const officeHref = (office: OfficeListItem) =>
  `/dashboard/office-site/${office.id}`;

// One of the office's totals: label over figure in the strip phones show,
// label beside figure in the column wider screens show.
const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) => (
  <div className='min-w-0 px-4 py-3 lg:flex lg:items-center lg:justify-between lg:gap-3 lg:px-5 lg:py-2.5'>
    <div className='min-w-0'>
      <p className='text-[11px] text-gray-500 lg:text-xs lg:text-gray-600'>
        {label}
      </p>
      {hint && (
        <p className='hidden truncate text-[11px] text-gray-400 lg:block'>
          {hint}
        </p>
      )}
    </div>
    <p className='flex items-baseline gap-1.5'>
      <span className='text-lg font-semibold leading-tight tabular-nums text-gray-900'>
        {value.toLocaleString("en-IN")}
      </span>
      {hint && (
        <span className='truncate text-[11px] text-gray-400 lg:hidden'>
          {hint}
        </span>
      )}
    </p>
  </div>
);

// A site among the office's newest: its status, name, city and when it was
// added, marked new when recent.
const SiteTile = ({ site, index }: { site: LatestSite; index: number }) => {
  const isActive = site.status === "active";
  const addedOn = new Date(site.created_at);
  const isNew = differenceInCalendarDays(new Date(), addedOn) < NEW_SITE_DAYS;

  return (
    <li
      className={cn(
        "flex min-w-0 items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors group-hover:border-gray-300",
        index >= PHONE_SITES && "max-sm:hidden",
      )}>
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full ring-2",
          isActive
            ? "bg-emerald-500 ring-emerald-100"
            : "bg-gray-300 ring-gray-100",
        )}
        title={isActive ? "Active site" : "Inactive site"}
      />
      <span className='sr-only'>{isActive ? "Active:" : "Inactive:"}</span>
      <div className='min-w-0 flex-1'>
        <div className='flex min-w-0 items-center gap-1.5'>
          <span
            className='truncate text-[13px] font-medium text-gray-800'
            title={site.name}>
            {capitalFirstLetter(site.name)}
          </span>
          {isNew && (
            <span className='shrink-0 rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold leading-4 text-emerald-700 ring-1 ring-inset ring-emerald-200'>
              New
            </span>
          )}
        </div>
        <p className='mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-gray-500'>
          {site.city && (
            <>
              <span className='truncate'>{capitalizeEachWord(site.city)}</span>
              <span
                aria-hidden='true'
                className='text-gray-300'>
                ·
              </span>
            </>
          )}
          <span className='shrink-0'>
            Added {format(addedOn, "d MMM yyyy")}
          </span>
        </p>
      </div>
    </li>
  );
};

// The office's newest sites, newest first, and a pointer to all of them
// when there are more.
const LatestSites = ({ office }: { office: OfficeListItem }) => {
  const sites = office.latestSites;
  const hasMoreOnPhones =
    office.siteCount > Math.min(sites.length, PHONE_SITES);
  const hasMoreOnWider = office.siteCount > sites.length;
  const viewAll = (
    <>
      View all {office.siteCount}
      <ArrowUpRight className='size-3' />
    </>
  );

  return (
    <div className='min-w-0 p-4 lg:px-5'>
      <div className='mb-2.5 flex items-center justify-between gap-3'>
        <p className='flex items-center gap-1.5 text-xs font-medium text-gray-700'>
          <MapPinned className='size-3.5 text-gray-400' />
          Latest sites
        </p>
        {/* The card itself opens the office, so this only says so. */}
        <p
          aria-hidden='true'
          className='text-xs font-medium text-emerald-700'>
          {hasMoreOnPhones && (
            <span className='inline-flex items-center gap-0.5 sm:hidden'>
              {viewAll}
            </span>
          )}
          {hasMoreOnWider && (
            <span className='inline-flex items-center gap-0.5 max-sm:hidden'>
              {viewAll}
            </span>
          )}
        </p>
      </div>

      {sites.length === 0 ? (
        <p className='flex h-[58px] items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400'>
          No sites yet
        </p>
      ) : (
        <ul className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'>
          {sites.map((site, index) => (
            <SiteTile
              key={site.id}
              site={site}
              index={index}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

// Changes to an office, for its manager and admins.
const OfficeActions = ({ office }: { office: OfficeListItem }) => {
  const { setParams } = useHandleParams();
  const officeParams = {
    officeId: String(office.id),
    officeName: office.name,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          aria-label={`More actions for ${office.name}`}
          className='relative z-10 size-8 shrink-0 p-0 text-gray-500 hover:text-gray-900'>
          <MoreVertical className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-48'>
        <DropdownMenuItem asChild>
          <Link href={officeHref(office)}>
            <ArrowUpRight className='mr-2 size-4' />
            Open office
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            setParams({ dialog: "edit-office", officeId: String(office.id) })
          }>
          <Pencil className='mr-2 size-4' />
          Edit office
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setParams({ dialog: "manage-office-members", ...officeParams })
          }>
          <Users className='mr-2 size-4' />
          Manage members
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setParams({ dialog: "create-site", ...officeParams })}>
          <Plus className='mr-2 size-4' />
          Create site
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// One office in the list, a full row wide: who it is and who runs it, its
// totals, and its newest sites. The whole card opens the office's page,
// which lists every site and work order.
const OfficeCard = ({ office }: { office: OfficeListItem }) => {
  const status = office.status.toLowerCase();
  const location = [office.city, office.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part))
    .join(", ");

  return (
    <article className='group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-500/30 hover:border-emerald-300 hover:shadow-md'>
      {/* Identity */}
      <div className='flex items-start gap-3 px-4 py-4 lg:px-5'>
        <div className='shrink-0 rounded-lg bg-emerald-50 p-2.5 text-emerald-700 ring-1 ring-emerald-100'>
          <Building2 className='size-5' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1'>
            <h3 className='text-[15px] font-semibold leading-snug text-gray-900'>
              {/* Stretched over the card, so a click anywhere opens it. */}
              <Link
                href={officeHref(office)}
                className='break-words outline-none transition-colors after:absolute after:inset-0 after:rounded-xl after:content-[""] group-hover:text-emerald-700'>
                {office.name.toUpperCase()}
              </Link>
            </h3>
            <Pill
              className={cn(
                "shrink-0",
                STATUS_STYLES[status] ??
                  "bg-gray-50 text-gray-700 ring-gray-200",
              )}>
              {capitalFirstLetter(office.status)}
            </Pill>
          </div>
          <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
            {location && (
              <span className='inline-flex min-w-0 items-center gap-1.5'>
                <MapPin className='size-3.5 shrink-0 text-gray-400' />
                {location}
              </span>
            )}
            <span className='inline-flex min-w-0 items-center gap-1.5'>
              <UserCog className='size-3.5 shrink-0 text-gray-400' />
              {office.manager ? (
                <span>
                  <span className='font-medium text-gray-700'>
                    {capitalizeEachWord(office.manager.name)}
                  </span>{" "}
                  <span className='text-gray-400'>· Manager</span>
                </span>
              ) : (
                <span className='text-gray-400'>No manager yet</span>
              )}
            </span>
            <span
              className='inline-flex min-w-0 max-w-full items-center gap-1.5'
              title={office.email}>
              <Mail className='size-3.5 shrink-0 text-gray-400' />
              <span className='truncate'>{office.email}</span>
            </span>
            <span className='inline-flex items-center gap-1.5'>
              <CalendarDays className='size-3.5 shrink-0 text-gray-400' />
              Added {format(new Date(office.created_at), "d MMM yyyy")}
            </span>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-1'>
          <span
            aria-hidden='true'
            className='hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors group-hover:bg-emerald-50 sm:inline-flex'>
            Open office
            <ArrowUpRight className='size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
          </span>
          {office.canManage && <OfficeActions office={office} />}
        </div>
      </div>

      {/* Totals beside the newest sites; stacked on phones. */}
      <div className='grid border-t border-gray-100 lg:grid-cols-[13rem_minmax(0,1fr)]'>
        <div className='grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/70 lg:grid-cols-1 lg:content-start lg:divide-x-0 lg:divide-y lg:border-b-0 lg:border-r'>
          <Stat
            label='Sites'
            value={office.siteCount}
            hint={
              office.siteCount > 0
                ? `${office.activeSiteCount} active`
                : undefined
            }
          />
          <Stat
            label='Work orders'
            value={office.workOrderCount}
          />
          <Stat
            label='Office operators'
            value={office.operators.length}
          />
        </div>
        <LatestSites office={office} />
      </div>
    </article>
  );
};

export default OfficeCard;

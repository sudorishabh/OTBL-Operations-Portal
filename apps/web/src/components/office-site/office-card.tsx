import React from "react";
import RecordCode from "@/components/shared/record-code";
import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  ChevronRight,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
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

// Phones list this many of the newest sites; wider screens list them all.
const PHONE_SITES = 3;

// Sites added within this many days are marked new.
const NEW_SITE_DAYS = 30;

const officeHref = (office: OfficeListItem) =>
  `/dashboard/office-site/${office.id}`;

// One of the office's totals. Each sits in a fixed-width column, so the
// figures line up from card to card and the list reads like a ledger.
const Figure = ({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) => (
  <div className='min-w-0 px-4 py-3 lg:w-24 lg:px-0 lg:py-0 lg:text-right'>
    <dt className='text-[11px] text-gray-500'>{label}</dt>
    <dd className='text-xl font-semibold leading-7 tabular-nums text-gray-900'>
      {value.toLocaleString("en-IN")}
    </dd>
    <dd className='h-4 text-[11px] leading-4 text-gray-400'>{note}</dd>
  </div>
);

// A site among the office's newest, as a line in a dated log. Sites are
// active unless marked, and recent ones are marked new.
const SiteLine = ({ site, index }: { site: LatestSite; index: number }) => {
  const addedOn = new Date(site.created_at);
  const isActive = site.status === "active";
  const isNew = differenceInCalendarDays(new Date(), addedOn) < NEW_SITE_DAYS;
  // Most site names already say where they are.
  const showCity =
    !!site.city && !site.name.toLowerCase().includes(site.city.toLowerCase());

  return (
    <li
      className={cn(
        "flex h-9 min-w-0 items-center gap-3 border-t border-gray-100",
        index >= PHONE_SITES && "max-sm:hidden",
      )}>
      <time
        dateTime={addedOn.toISOString()}
        className='w-[4.5rem] shrink-0 text-[11px] tabular-nums text-gray-400'>
        {format(addedOn, "d MMM yyyy")}
      </time>
      <span
        className={cn(
          "truncate text-[13px] font-medium",
          isActive ? "text-gray-800" : "text-gray-400",
        )}
        title={site.name}>
        {capitalFirstLetter(site.name)}
      </span>
      {showCity && (
        <span className='hidden shrink-0 text-xs text-gray-400 md:inline'>
          {capitalizeEachWord(site.city)}
        </span>
      )}
      {!isActive && (
        <span className='shrink-0 text-[11px] text-gray-500'>Inactive</span>
      )}
      {isNew && (
        <span className='ml-auto shrink-0 rounded-full bg-emerald-50 px-1.5 text-[10px] font-semibold leading-4 text-emerald-700 ring-1 ring-inset ring-emerald-200'>
          New
        </span>
      )}
    </li>
  );
};

// The office's newest sites, newest first down each column.
const NewestSites = ({ office }: { office: OfficeListItem }) => {
  const sites = office.latestSites;
  const hasMoreOnPhones =
    office.siteCount > Math.min(sites.length, PHONE_SITES);
  const hasMoreOnWider = office.siteCount > sites.length;
  const seeAll = `See all ${office.siteCount} sites`;

  return (
    <div className='px-4 pb-3 pt-3 lg:px-5'>
      <div className='flex items-baseline justify-between gap-3 pb-2'>
        <h4 className='text-xs font-medium text-gray-700'>Newest sites</h4>
        {/* The card itself opens the office, so this only says so. */}
        <p
          aria-hidden='true'
          className='text-xs font-medium text-emerald-700 group-hover:underline'>
          {hasMoreOnPhones && <span className='sm:hidden'>{seeAll}</span>}
          {hasMoreOnWider && <span className='max-sm:hidden'>{seeAll}</span>}
        </p>
      </div>

      {sites.length === 0 ? (
        <p className='flex h-9 items-center border-t border-gray-100 text-xs text-gray-400'>
          No sites yet.
        </p>
      ) : (
        <ol className='grid grid-cols-1 lg:grid-flow-col lg:grid-cols-2 lg:grid-rows-3 lg:gap-x-10'>
          {sites.map((site, index) => (
            <SiteLine
              key={site.id}
              site={site}
              index={index}
            />
          ))}
        </ol>
      )}
    </div>
  );
};

// Changes to an office: its sites for its operators and admins, its details
// and members for admins alone.
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
        {office.canManage && (
          <>
            <DropdownMenuItem
              onClick={() =>
                setParams({
                  dialog: "edit-office",
                  officeId: String(office.id),
                })
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
          </>
        )}
        <DropdownMenuItem
          onClick={() => setParams({ dialog: "create-site", ...officeParams })}>
          <Plus className='mr-2 size-4' />
          Create site
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// One office in the list, a full row wide: who it is and where, its
// totals in aligned columns, and a log of its newest sites. The whole card
// opens the office's page, which lists every site and work order.
const OfficeCard = ({ office }: { office: OfficeListItem }) => {
  const location = [office.city, office.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part))
    .join(", ");

  return (
    <article className='group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors duration-200 focus-within:ring-2 focus-within:ring-emerald-500/30 hover:border-emerald-300'>
      <div className='flex flex-col lg:flex-row lg:items-start'>
        {/* Identity */}
        <div className='flex min-w-0 flex-1 items-start gap-2.5 px-4 pt-4 lg:px-5 lg:pb-4'>
          {/* A small mark, as tall as the name beside it. */}
          <div className='shrink-0 rounded-md bg-emerald-50 p-1 text-emerald-700 ring-1 ring-emerald-100'>
            <Building2 className='size-3.5' />
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
              <RecordCode code={office.code} />
            </div>
            <div className='mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
              {location && (
                <span className='inline-flex items-center gap-1.5'>
                  <MapPin className='size-3.5 shrink-0 text-gray-400' />
                  {location}
                </span>
              )}
            </div>
            <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500'>
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
          {/* Until the figures fit beside the name, the menu stays by it. */}
          <div className='lg:hidden'>
            {office.canEditSites && <OfficeActions office={office} />}
          </div>
        </div>

        {/* Totals */}
        <dl className='mt-3 grid grid-cols-3 divide-x divide-gray-100 border-y border-gray-100 bg-gray-50/70 lg:mt-0 lg:flex lg:shrink-0 lg:gap-2 lg:divide-x-0 lg:border-0 lg:bg-transparent lg:py-4'>
          <Figure
            label='Sites'
            value={office.siteCount}
            note={
              office.siteCount > 0
                ? `${office.activeSiteCount} active`
                : undefined
            }
          />
          <Figure
            label='Work orders'
            value={office.workOrderCount}
          />
          <Figure
            label='Operators'
            value={office.operators.length}
          />
        </dl>

        <div className='hidden shrink-0 items-start gap-1 py-4 pl-6 pr-3 lg:flex'>
          {/* An empty slot without the menu keeps the figures in line. */}
          {office.canEditSites ? (
            <OfficeActions office={office} />
          ) : (
            <span className='size-8' />
          )}
          <ChevronRight
            aria-hidden='true'
            className='mt-2 size-4 text-gray-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-emerald-600'
          />
        </div>
      </div>

      <div className='lg:border-t lg:border-gray-100'>
        <NewestSites office={office} />
      </div>
    </article>
  );
};

export default OfficeCard;

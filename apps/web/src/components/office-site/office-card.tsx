import React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
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

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  inactive: "bg-amber-50 text-amber-700 ring-amber-200",
};

const officeHref = (office: OfficeListItem) =>
  `/dashboard/office-site/${office.id}`;

// A figure in the card's strip of totals.
const Stat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) => (
  <div className='min-w-0 px-4 py-2.5'>
    <p className='text-[11px] text-gray-500'>{label}</p>
    <p className='text-base font-semibold leading-tight tabular-nums text-gray-900'>
      {value.toLocaleString("en-IN")}
    </p>
    {/* Fixed height keeps the figures level when one has no hint. */}
    <p className='h-4 truncate text-[11px] leading-4 text-gray-400'>{hint}</p>
  </div>
);

// The office's newest sites, with how many more its page lists.
const LatestSites = ({ office }: { office: OfficeListItem }) => {
  const sites = office.latestSites;
  const more = office.siteCount - sites.length;

  return (
    <div className='border-b border-gray-100 px-4 py-3'>
      <div className='flex items-center justify-between text-[11px]'>
        <span className='font-medium uppercase tracking-wide text-gray-400'>
          Latest sites
        </span>
        {more > 0 && <span className='text-gray-500'>+{more} more</span>}
      </div>
      {/* Room for three rows, so cards side by side stay level. */}
      <ul className='mt-1.5 min-h-[68px] space-y-1'>
        {sites.length === 0 ? (
          <li className='text-xs leading-5 text-gray-400'>No sites yet</li>
        ) : (
          sites.map((site) => {
            const isActive = site.status === "active";
            return (
              <li
                key={site.id}
                className='flex h-5 min-w-0 items-center gap-2 text-xs'>
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-gray-300",
                  )}
                  title={isActive ? "Active site" : "Inactive site"}
                />
                <span className='sr-only'>
                  {isActive ? "Active:" : "Inactive:"}
                </span>
                <span
                  className='truncate font-medium text-gray-700'
                  title={site.name}>
                  {capitalFirstLetter(site.name)}
                </span>
                <span className='ml-auto shrink-0 pl-2 text-gray-400'>
                  {format(new Date(site.created_at), "d MMM yyyy")}
                </span>
              </li>
            );
          })
        )}
      </ul>
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
          className='relative z-10 -mr-2 -mt-1 size-8 shrink-0 p-0 text-gray-500 hover:text-gray-900'>
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

// One office in the list: who it is, its totals, its newest sites and its
// manager. The whole card opens the office's page, which lists every site
// and work order.
const OfficeCard = ({ office }: { office: OfficeListItem }) => {
  const status = office.status.toLowerCase();
  const location = [office.city, office.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part))
    .join(", ");

  return (
    <article className='group relative flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-500/30 hover:border-emerald-300 hover:shadow-md'>
      <div className='flex items-start gap-3 px-4 pt-4'>
        <div className='shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100'>
          <Building2 className='size-4' />
        </div>
        <div className='min-w-0 flex-1'>
          <h3 className='text-sm font-semibold leading-snug text-gray-900'>
            {/* Stretched over the card, so a click anywhere opens it. */}
            <Link
              href={officeHref(office)}
              className='break-words outline-none transition-colors after:absolute after:inset-0 after:rounded-xl after:content-[""] group-hover:text-emerald-700'>
              {office.name.toUpperCase()}
            </Link>
          </h3>
          {location && (
            <p className='mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-500'>
              <MapPin className='size-3.5 shrink-0 text-gray-400' />
              <span className='truncate'>{location}</span>
            </p>
          )}
        </div>
        <Pill
          className={cn(
            "shrink-0",
            STATUS_STYLES[status] ?? "bg-gray-50 text-gray-700 ring-gray-200",
          )}
          title={`${capitalFirstLetter(office.status)} office`}>
          {capitalFirstLetter(office.status)}
        </Pill>
        {office.canManage && <OfficeActions office={office} />}
      </div>

      <div className='mt-4 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200 bg-gray-50/60'>
        <Stat
          label='Sites'
          value={office.siteCount}
          hint={
            office.siteCount > 0
              ? `${office.activeSiteCount} active`
              : "None yet"
          }
        />
        <Stat
          label='Work orders'
          value={office.workOrderCount}
        />
        <Stat
          label='Operators'
          value={office.operators.length}
        />
      </div>

      <LatestSites office={office} />

      <div className='space-y-1.5 px-4 py-3 text-xs text-gray-600'>
        <p className='flex min-w-0 items-center gap-1.5'>
          <UserCog className='size-3.5 shrink-0 text-gray-400' />
          {office.manager ? (
            <span className='truncate'>
              <span className='font-medium text-gray-800'>
                {capitalizeEachWord(office.manager.name)}
              </span>
              <span className='text-gray-400'> · Manager</span>
            </span>
          ) : (
            <span className='text-gray-400'>No manager yet</span>
          )}
        </p>
        <p
          className='flex min-w-0 items-center gap-1.5'
          title={office.email}>
          <Mail className='size-3.5 shrink-0 text-gray-400' />
          <span className='truncate'>{office.email}</span>
        </p>
      </div>

      <div className='mt-auto flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500'>
        <span className='inline-flex items-center gap-1.5'>
          <CalendarDays className='size-3.5 text-gray-400' />
          Added {format(new Date(office.created_at), "dd MMM yyyy")}
        </span>
        <span
          aria-hidden='true'
          className='inline-flex items-center gap-1 font-medium text-emerald-700'>
          Open office
          <ArrowUpRight className='size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5' />
        </span>
      </div>
    </article>
  );
};

export default OfficeCard;

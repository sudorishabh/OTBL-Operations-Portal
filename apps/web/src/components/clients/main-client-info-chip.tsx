"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import { Info } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useIsAdmin } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { ClientListItem } from "./client-list-parts";

export type MainClientInfo = ClientListItem & {
  gst_number?: string | null;
  updated_at?: string | Date;
  contacts_count: number;
};

const formatDate = (value: string | Date | null | undefined) => {
  const date = value ? new Date(value) : null;
  return date && !isNaN(date.getTime()) ? format(date, "d MMM yyyy") : null;
};

// A label and its value on one line.
const Detail = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <>
    <dt className='text-gray-400'>{label}</dt>
    <dd className='min-w-0 break-words text-gray-800'>
      {value || <span className='text-gray-300'>—</span>}
    </dd>
  </>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className='border-t border-gray-100 px-4 py-2.5'>
    <h4 className='mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
      {title}
    </h4>
    <dl className='grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 text-xs'>
      {children}
    </dl>
  </section>
);

// A main client's details, as the hover card shows them.
const MainClientDetails = ({
  parentClient,
  branchCount,
}: {
  parentClient: MainClientInfo;
  branchCount: number;
}) => {
  const isAdmin = useIsAdmin();
  const isActive = parentClient.status !== "inactive";
  const place = [parentClient.city, parentClient.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part!))
    .join(", ");
  const hasDetails = [
    parentClient.address,
    place,
    parentClient.pincode,
    parentClient.gst_number,
    parentClient.contact_number,
    parentClient.email,
  ].some(Boolean);
  const contacts = parentClient.contacts_count;

  return (
    <>
      <div className='px-4 py-3'>
        <div className='flex items-start justify-between gap-3'>
          <p className='text-sm font-semibold text-gray-900'>
            {capitalizeEachWord(parentClient.name)}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              isActive
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-amber-50 text-amber-700 ring-amber-200",
            )}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <p className='mt-0.5 text-xs text-gray-500'>
          Main client with {branchCount}{" "}
          {branchCount === 1 ? "branch" : "branches"} and {contacts}{" "}
          {contacts === 1 ? "contact person" : "contact persons"}
        </p>
      </div>

      {hasDetails ? (
        <Section title='Head office'>
          <Detail
            label='Address'
            value={parentClient.address}
          />
          <Detail
            label='City, state'
            value={place}
          />
          <Detail
            label='Pincode'
            value={parentClient.pincode}
          />
          <Detail
            label='GST number'
            value={
              parentClient.gst_number && (
                <span className='font-mono'>{parentClient.gst_number}</span>
              )
            }
          />
          <Detail
            label='Phone'
            value={
              parentClient.contact_number && (
                <a
                  href={`tel:${parentClient.contact_number}`}
                  className='hover:text-emerald-700 hover:underline'>
                  {parentClient.contact_number}
                </a>
              )
            }
          />
          <Detail
            label='Email'
            value={
              parentClient.email && (
                <a
                  href={`mailto:${parentClient.email}`}
                  className='hover:text-emerald-700 hover:underline'>
                  {parentClient.email}
                </a>
              )
            }
          />
        </Section>
      ) : (
        <div className='border-t border-gray-100 px-4 py-3 text-xs text-gray-500'>
          No address, GST or contact details added yet.
          {isAdmin && " Add them with Edit main client in the ⋮ menu."}
        </div>
      )}

      <Section title='Record'>
        <Detail
          label='Added on'
          value={formatDate(parentClient.created_at)}
        />
        <Detail
          label='Last updated'
          value={formatDate(parentClient.updated_at)}
        />
      </Section>
    </>
  );
};

// A chip beside a main client's name that shows its details on hover, on
// keyboard focus, or when tapped on a touch screen.
const MainClientInfoChip = ({
  parentClient,
  branchCount,
  className,
}: {
  parentClient: MainClientInfo;
  branchCount: number;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={setIsOpen}
      openDelay={150}
      closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type='button'
          onClick={() => setIsOpen(true)}
          aria-label={`${capitalizeEachWord(parentClient.name)} details`}
          className={cn(
            "inline-flex shrink-0 cursor-default items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200 transition-colors hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 data-[state=open]:bg-emerald-50 data-[state=open]:text-emerald-700 data-[state=open]:ring-emerald-200",
            className,
          )}>
          <Info className='size-3' />
          Info
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side='bottom'
        align='start'
        collisionPadding={16}
        className='max-h-[min(30rem,var(--radix-hover-card-content-available-height))] w-[22rem] max-w-[calc(100vw-2rem)] overflow-y-auto p-0'>
        <MainClientDetails
          parentClient={parentClient}
          branchCount={branchCount}
        />
      </HoverCardContent>
    </HoverCard>
  );
};

export default MainClientInfoChip;

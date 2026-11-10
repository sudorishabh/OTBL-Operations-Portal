"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { cn } from "@/lib/utils";
import type { ContactOwner } from "./client-contacts-dialog";

const ClientContactsDialog = dynamic(() => import("./client-contacts-dialog"));

// On large screens the whole clients list is one grid, so the main client
// headers, branch rows and client cards line up in the same three columns:
// who and where, phone and email, then counts and actions. Each level in
// between is a subgrid spanning them.
export const LIST_COLUMNS =
  "lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto] lg:gap-x-4";
export const LIST_SUBGRID = "lg:col-span-full lg:grid lg:grid-cols-subgrid";

// Shared by the branch rows, the standalone client cards and the main client
// headers on the clients list. Main clients added before they had details
// have none.
export interface ClientListItem {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  contact_number?: string | null;
  email?: string | null;
  status?: string;
  contacts_count?: number;
  work_order_number?: number;
  proposal_number?: number;
  sites_work_done?: number;
  created_at?: string | Date;
}

export const formatClientLocation = (client: ClientListItem) => {
  const place = [client.city, client.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part!))
    .join(", ");
  const location = [client.address, place].filter(Boolean).join(", ");

  return [location, client.pincode].filter(Boolean).join(" ");
};

// The whole row/card opens the client page, so it acts as one link. Buttons
// inside it, and dialogs they open, don't.
export const ClientLink = ({
  clientId,
  label,
  className,
  children,
}: {
  clientId: number;
  label: string;
  className?: string;
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const open = () => router.push(`/dashboard/client/${clientId}`);

  return (
    <div
      role='link'
      tabIndex={0}
      aria-label={label}
      onClick={(e) => {
        // A dialog's clicks reach here through its portal; skip them.
        if (e.currentTarget.contains(e.target as Node)) open();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn("group cursor-pointer outline-none", className)}>
      {children}
    </div>
  );
};

export const ClientStatus = ({ status }: { status?: string }) => {
  const isActive = status === "active";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-[11px] font-medium",
        isActive ? "text-emerald-700" : "text-gray-400",
      )}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-gray-300",
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
};

export const ClientContactLines = ({
  client,
  className,
}: {
  client: ClientListItem;
  className?: string;
}) => (
  <div className={cn("min-w-0 text-xs text-gray-500", className)}>
    <p className='truncate text-gray-700'>
      {client.contact_number || (
        <span className='text-gray-400'>No phone number</span>
      )}
    </p>
    <p
      className='truncate'
      title={client.email ?? undefined}>
      {client.email || <span className='text-gray-400'>No email</span>}
    </p>
  </div>
);

const Count = ({
  value = 0,
  singular,
  plural,
}: {
  value?: number;
  singular: string;
  plural: string;
}) => (
  <span className={cn("whitespace-nowrap", value === 0 && "text-gray-400")}>
    <span
      className={cn(
        "font-semibold tabular-nums",
        value === 0 ? "text-gray-400" : "text-gray-900",
      )}>
      {value}
    </span>{" "}
    {value === 1 ? singular : plural}
  </span>
);

// Zero counts are dimmed so clients with active work stand out.
export const ClientCounts = ({
  client,
  className,
}: {
  client: ClientListItem;
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500",
      className,
    )}>
    <Count
      value={client.work_order_number}
      singular='work order'
      plural='work orders'
    />
    <Count
      value={client.proposal_number}
      singular='proposal'
      plural='proposals'
    />
    <Count
      value={client.sites_work_done}
      singular='site'
      plural='sites'
    />
  </div>
);

// Shows how many contact persons a client or main client has and opens them.
// The dialog mounts on first open, so a long list doesn't build one per row.
export const ContactsButton = ({
  owner,
  ownerName,
  count = 0,
  className,
}: {
  owner: ContactOwner;
  ownerName: string;
  count?: number;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const label = count === 1 ? "1 contact" : `${count} contacts`;

  return (
    <>
      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation();
          setHasOpened(true);
          setIsOpen(true);
        }}
        title={`Contacts of ${capitalizeEachWord(ownerName)}`}
        className={cn(
          "inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 text-xs font-medium outline-none transition-colors duration-150 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          count === 0 ? "text-gray-400" : "text-gray-700",
          className,
        )}>
        <Users className='size-3.5' />
        <span className='tabular-nums'>{label}</span>
      </button>
      {hasOpened && (
        <ClientContactsDialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          owner={owner}
          ownerName={ownerName}
        />
      )}
    </>
  );
};

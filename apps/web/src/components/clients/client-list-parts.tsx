"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { capitalizeEachWord } from "@pkg/utils";
import { cn } from "@/lib/utils";

// Shared by the branch rows and the standalone client cards on the clients list.
export interface ClientListItem {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
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

// The whole row/card opens the client page, so it acts as one link.
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
      onClick={open}
      onKeyDown={(e) => {
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

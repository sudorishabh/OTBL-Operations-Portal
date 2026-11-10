"use client";
import React from "react";
import { ChevronRight } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { cn } from "@/lib/utils";
import {
  ClientContactLines,
  ClientCounts,
  ClientLink,
  ClientStatus,
  ContactsButton,
  formatClientLocation,
  LIST_SUBGRID,
  type ClientListItem,
} from "./client-list-parts";

interface Props {
  branch: ClientListItem;
  parentName: string;
  isLast: boolean;
}

const SEPARATOR = /^[\s\-–—:,|/]+/;

// Under "ONGC", the branch "ongc - delhi" reads as "Delhi"; other names are kept.
const getBranchLabel = (name: string, parentName: string) => {
  const trimmed = name.trim();
  const prefix = parentName.trim().toLowerCase();
  const rest = trimmed.slice(prefix.length);

  if (
    !prefix ||
    !trimmed.toLowerCase().startsWith(prefix) ||
    !SEPARATOR.test(rest)
  ) {
    return capitalizeEachWord(trimmed);
  }
  return (
    capitalizeEachWord(rest.replace(SEPARATOR, "")) ||
    capitalizeEachWord(trimmed)
  );
};

const BranchRow = ({ branch, parentName, isLast }: Props) => {
  const label = getBranchLabel(branch.name, parentName);
  const location = formatClientLocation(branch);

  return (
    <li className={cn("relative pl-10", LIST_SUBGRID)}>
      {/* Tree connector: an elbow into this row, and the rail on to the next. */}
      <span
        aria-hidden='true'
        className='absolute left-[18px] top-0 h-1/2 w-[22px] rounded-bl-md border-b border-l border-gray-300'
      />
      {!isLast && (
        <span
          aria-hidden='true'
          className='absolute bottom-0 left-[18px] top-1/2 border-l border-gray-300'
        />
      )}

      <ClientLink
        clientId={branch.id}
        label={`Open branch ${label}`}
        className={cn(
          "grid grid-cols-1 items-center gap-y-2 rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30",
          LIST_SUBGRID,
        )}>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <span
              className='truncate text-sm font-semibold text-gray-900'
              title={capitalizeEachWord(branch.name)}>
              {label}
            </span>
            <ClientStatus status={branch.status} />
          </div>
          <p
            className='mt-0.5 truncate text-xs text-gray-500'
            title={location}>
            {location || "No address added"}
          </p>
        </div>

        <ClientContactLines client={branch} />

        <div className='flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end'>
          <ClientCounts client={branch} />
          <div className='ml-auto flex items-center gap-3 lg:ml-0'>
            <ContactsButton
              owner={{ clientId: branch.id }}
              ownerName={branch.name}
              count={branch.contacts_count}
            />
            <ChevronRight
              aria-hidden='true'
              className='size-4 shrink-0 text-gray-300 transition-colors duration-150 group-hover:text-emerald-600'
            />
          </div>
        </div>
      </ClientLink>
    </li>
  );
};

export default BranchRow;

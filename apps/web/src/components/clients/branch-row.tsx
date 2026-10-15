"use client";
import React from "react";
import { ChevronRight } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import {
  ClientContactLines,
  ClientCounts,
  ClientLink,
  ClientStatus,
  formatClientLocation,
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

  if (!prefix || !trimmed.toLowerCase().startsWith(prefix) || !SEPARATOR.test(rest)) {
    return capitalizeEachWord(trimmed);
  }
  return capitalizeEachWord(rest.replace(SEPARATOR, "")) || capitalizeEachWord(trimmed);
};

const BranchRow = ({ branch, parentName, isLast }: Props) => {
  const label = getBranchLabel(branch.name, parentName);
  const location = formatClientLocation(branch);

  return (
    <li className='relative pl-10'>
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
        className='grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-lg px-3 py-3 transition-colors duration-150 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto]'>
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

        <ClientContactLines
          client={branch}
          className='col-start-1 row-start-2 lg:col-start-2 lg:row-start-1'
        />

        <ClientCounts
          client={branch}
          className='col-start-1 row-start-3 lg:col-start-3 lg:row-start-1'
        />

        <ChevronRight
          aria-hidden='true'
          className='col-start-2 row-span-3 row-start-1 size-4 shrink-0 text-gray-300 transition-colors duration-150 group-hover:text-emerald-600 lg:col-start-4 lg:row-span-1'
        />
      </ClientLink>
    </li>
  );
};

export default BranchRow;

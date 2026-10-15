"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { cn } from "@/lib/utils";

export interface Branch {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contact_number?: string | null;
  email?: string | null;
  status?: string;
  work_order_number?: number;
  proposal_number?: number;
  sites_work_done?: number;
}

interface Props {
  branch: Branch;
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

const BranchRow = ({ branch, parentName, isLast }: Props) => {
  const router = useRouter();
  const openBranch = () => router.push(`/dashboard/client/${branch.id}`);

  const label = getBranchLabel(branch.name, parentName);
  const isActive = branch.status === "active";
  const place = [branch.city, branch.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part!))
    .join(", ");
  const location = [branch.address, place].filter(Boolean).join(", ");

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

      <div
        role='link'
        tabIndex={0}
        aria-label={`Open branch ${label}`}
        onClick={openBranch}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openBranch();
          }
        }}
        className='group grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-lg px-3 py-3 outline-none transition-colors duration-150 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto]'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <span
              className='truncate text-sm font-semibold text-gray-900'
              title={capitalizeEachWord(branch.name)}>
              {label}
            </span>
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
          </div>
          <p
            className='mt-0.5 truncate text-xs text-gray-500'
            title={location}>
            {location || "No address added"}
            {branch.pincode ? ` ${branch.pincode}` : ""}
          </p>
        </div>

        <div className='col-start-1 row-start-2 min-w-0 text-xs text-gray-500 lg:col-start-2 lg:row-start-1'>
          <p className='truncate text-gray-700'>
            {branch.contact_number || (
              <span className='text-gray-400'>No phone number</span>
            )}
          </p>
          <p
            className='truncate'
            title={branch.email ?? undefined}>
            {branch.email || <span className='text-gray-400'>No email</span>}
          </p>
        </div>

        <div className='col-start-1 row-start-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 lg:col-start-3 lg:row-start-1'>
          <Count
            value={branch.work_order_number}
            singular='work order'
            plural='work orders'
          />
          <Count
            value={branch.proposal_number}
            singular='proposal'
            plural='proposals'
          />
          <Count
            value={branch.sites_work_done}
            singular='site'
            plural='sites'
          />
        </div>

        <ChevronRight
          aria-hidden='true'
          className='col-start-2 row-span-3 row-start-1 size-4 shrink-0 text-gray-300 transition-colors duration-150 group-hover:text-emerald-600 lg:col-start-4 lg:row-span-1'
        />
      </div>
    </li>
  );
};

export default BranchRow;

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonRegion, TableSkeleton, type SkeletonColumn } from "../parts";

const HEAD =
  "h-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400";

// Same columns as the overview's recent work orders table.
const RECENT_COLUMNS: SkeletonColumn[] = [
  {
    label: "Code",
    headClassName: `${HEAD} px-4`,
    cellClassName: "px-4 py-1.5",
    bar: "w-32",
  },
  {
    label: "Title",
    headClassName: `${HEAD} px-3`,
    cellClassName: "px-3 py-1.5",
    bar: ["w-56", "w-64", "w-48"],
  },
  {
    label: "Client",
    headClassName: `${HEAD} px-3`,
    cellClassName: "px-3 py-1.5",
    bar: ["w-36", "w-32", "w-40"],
  },
  {
    label: "Office",
    headClassName: `${HEAD} hidden px-3 lg:table-cell`,
    cellClassName: "hidden px-3 py-1.5 lg:table-cell",
    bar: ["w-32", "w-36", "w-28"],
  },
  {
    label: "Updated",
    headClassName: `${HEAD} hidden px-3 md:table-cell`,
    cellClassName: "hidden px-3 py-1.5 md:table-cell",
    bar: "w-20",
  },
  {
    label: "Status",
    headClassName: `${HEAD} px-4 text-right`,
    cellClassName: "px-4 py-1.5",
    shape: "pill",
    bar: "w-14",
    align: "right",
  },
];

// The rows of the recent work orders card, under its real headings.
export const RecentWorkOrdersSkeleton = () => (
  <SkeletonRegion label='Loading recent work orders'>
    <TableSkeleton
      columns={RECENT_COLUMNS}
      rows={8}
      className='rounded-none border-0'
      headRowClassName='border-gray-200 bg-gray-50/60'
      rowClassName='h-[53px] border-gray-100'
    />
  </SkeletonRegion>
);

// Where a figure sits under its label in a stat tile.
export const StatValueSkeleton = () => (
  <div className='mt-0.5 flex h-[22.5px] items-center'>
    <Skeleton className='h-4 w-12' />
  </div>
);

const STAT_LABELS = [
  "Clients",
  "Contacts",
  "Offices",
  "Sites",
  "Work orders",
  "Pending",
  "Completed",
  "Cancelled",
];

// The overview before the signed-in user is known: the summary card with
// its figures, then the recent work orders card.
const DashboardPageSkeleton = () => (
  <SkeletonRegion
    label='Loading the overview'
    className='mt-3 space-y-3'>
    <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='flex items-center gap-2.5 px-4 py-2.5'>
        <Skeleton className='size-8 shrink-0 rounded-lg' />
        <div className='min-w-0 flex-1'>
          <div className='flex h-[17.5px] items-center'>
            <Skeleton className='h-3.5 w-28' />
          </div>
          <div className='flex h-[15px] items-center'>
            <Skeleton className='h-3 w-72 max-w-full' />
          </div>
        </div>
        <Skeleton className='h-5 w-14 shrink-0' />
      </div>

      <div className='grid grid-cols-2 divide-x divide-y divide-gray-200 border-y border-gray-200 bg-gray-50/60 sm:grid-cols-4 lg:grid-cols-8 lg:divide-y-0'>
        {STAT_LABELS.map((label) => (
          <div
            key={label}
            className='min-w-0 px-3 py-2'>
            <div className='flex items-center gap-1.5'>
              <Skeleton className='size-3 shrink-0 rounded-full' />
              <span className='truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
                {label}
              </span>
            </div>
            <StatValueSkeleton />
          </div>
        ))}
      </div>

      <div className='flex flex-wrap items-center gap-1.5 px-4 py-2'>
        <span className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
          Go to
        </span>
        {["w-20", "w-28", "w-32", "w-36"].map((width) => (
          <Skeleton
            key={width}
            className={`h-7 ${width}`}
          />
        ))}
      </div>
    </div>

    <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-2'>
        <h2 className='text-[14px] font-semibold tracking-tight text-gray-900'>
          Recent work orders
        </h2>
        <Skeleton className='h-3 w-14' />
      </div>
      <TableSkeleton
        columns={RECENT_COLUMNS}
        rows={8}
        className='rounded-none border-0'
        headRowClassName='border-gray-200 bg-gray-50/60'
        rowClassName='h-[53px] border-gray-100'
      />
    </div>
  </SkeletonRegion>
);

export default DashboardPageSkeleton;

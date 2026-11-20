import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
    label: "Purchase order",
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

// A headline tile's place: its icon and label, figure and line under it.
const TileSkeleton = () => (
  <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm'>
    <div className='flex items-center gap-2'>
      <Skeleton className='size-7 shrink-0 rounded-lg' />
      <Skeleton className='h-3 w-20' />
    </div>
    <Skeleton className='mt-2.5 h-6 w-24' />
    <Skeleton className='mt-1.5 h-3 w-32' />
  </div>
);

// A module card's place: its name, then its figures side by side.
const ModuleSkeleton = () => (
  <div className='rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm'>
    <Skeleton className='h-4 w-28' />
    <div className='mt-3 grid grid-cols-3 gap-2'>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className='space-y-1.5'>
          <Skeleton className='h-2.5 w-12' />
          <Skeleton className='h-4 w-10' />
        </div>
      ))}
    </div>
  </div>
);

// A card's place: its title and the line under it, then its content as one
// block of the given height.
const CardBlockSkeleton = ({
  className,
  bodyClassName,
}: {
  className?: string;
  bodyClassName: string;
}) => (
  <div
    className={cn(
      "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm",
      className,
    )}>
    <div className='border-b border-gray-200 px-4 py-2.5'>
      <Skeleton className='h-3.5 w-32' />
      <Skeleton className='mt-1.5 h-3 w-48' />
    </div>
    <div className='p-4'>
      <Skeleton className={cn("w-full", bodyClassName)} />
    </div>
  </div>
);

// The overview before the signed-in user is known, laid out as it loads:
// headline tiles, modules, the cards in their rows, then recent work orders.
const DashboardPageSkeleton = () => (
  <SkeletonRegion
    label='Loading the overview'
    className='mt-3 space-y-3'>
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5'>
      {[0, 1, 2, 3, 4].map((index) => (
        <TileSkeleton key={index} />
      ))}
    </div>

    <div className='grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3'>
      {[0, 1, 2, 3].map((index) => (
        <ModuleSkeleton key={index} />
      ))}
    </div>

    <div className='grid gap-3 lg:grid-cols-3'>
      <CardBlockSkeleton
        className='lg:col-span-2'
        bodyClassName='h-[22rem]'
      />
      <CardBlockSkeleton bodyClassName='h-[22rem]' />
    </div>

    <div className='grid gap-3 lg:grid-cols-3'>
      <CardBlockSkeleton
        className='lg:col-span-2'
        bodyClassName='h-[23rem]'
      />
      <CardBlockSkeleton bodyClassName='h-[23rem]' />
    </div>

    <div className='grid gap-3 lg:grid-cols-3'>
      <CardBlockSkeleton
        className='lg:col-span-2'
        bodyClassName='h-[19rem]'
      />
      <CardBlockSkeleton bodyClassName='h-[19rem]' />
    </div>

    <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='border-b border-gray-200 px-4 py-2.5'>
        <h2 className='text-[14px] leading-tight font-semibold tracking-tight text-gray-900'>
          Recent work orders
        </h2>
        <Skeleton className='mt-1.5 h-3 w-20' />
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

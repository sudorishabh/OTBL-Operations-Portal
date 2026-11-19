import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FilterBarSkeleton,
  SkeletonRegion,
  TableSkeleton,
  TextLine,
  type SkeletonColumn,
} from "../parts";

// Same columns as SitesTable.
const SITE_COLUMNS: SkeletonColumn[] = [
  { label: "Status", cellClassName: "pl-6", shape: "dot" },
  {
    label: "Name",
    headClassName: "pl-4",
    cellClassName: "pl-4",
    bar: ["w-28", "w-36", "w-32"],
  },
  { label: "Address", bar: ["w-44", "w-40", "w-48"], sub: "w-28" },
  { label: "Pincode", bar: "w-14" },
  { label: "Created", bar: "w-16" },
  {
    label: "Actions",
    headClassName: "pr-4 text-right",
    cellClassName: "pr-4",
    shape: "menu",
  },
];

const SitesTable = ({ rows }: { rows: number }) => (
  <TableSkeleton
    columns={SITE_COLUMNS}
    rows={rows}
    className='bg-gray-100/60'
    rowClassName='h-[65px]'
  />
);

// An office's sites table while a page of its sites loads.
export const OfficeSitesTableSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <SkeletonRegion label='Loading sites'>
    <SitesTable rows={rows} />
  </SkeletonRegion>
);

// Mirrors OfficeCard: icon, name and status, two meta lines and the three
// figures; then the log of the newest sites.
const OfficeCardSkeleton = () => (
  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white'>
    <div className='flex flex-col lg:flex-row lg:items-start'>
      <div className='flex min-w-0 flex-1 items-start gap-2.5 px-4 pt-4 lg:px-5 lg:pb-4'>
        <Skeleton className='size-[22px] shrink-0 rounded-md' />
        <div className='min-w-0 flex-1'>
          <div className='flex h-[22.5px] items-center gap-2.5'>
            <Skeleton className='h-4 w-56 max-w-[60%]' />
            <Skeleton className='h-5 w-14 rounded-full' />
          </div>
          <div className='mt-1.5 flex h-4 items-center gap-4'>
            <Skeleton className='h-3 w-28' />
            <Skeleton className='h-3 w-36' />
          </div>
          <div className='mt-1 flex h-4 items-center gap-4'>
            <Skeleton className='h-3 w-52 max-w-[60%]' />
            <Skeleton className='h-3 w-24' />
          </div>
        </div>
      </div>
      <div className='mt-3 grid grid-cols-3 divide-x divide-gray-100 border-y border-gray-100 bg-gray-50/70 lg:mt-0 lg:flex lg:shrink-0 lg:gap-2 lg:divide-x-0 lg:border-0 lg:bg-transparent lg:py-4'>
        {["w-8", "w-16", "w-14"].map((width) => (
          <div
            key={width}
            className='flex flex-col px-4 py-3 lg:w-24 lg:items-end lg:px-0 lg:py-0'>
            <TextLine
              line='h-[16.5px]'
              className={cn("h-2.5", width)}
            />
            <TextLine
              line='h-7'
              className='h-5 w-6'
            />
            <div className='h-4' />
          </div>
        ))}
      </div>
      <div className='hidden w-22 shrink-0 lg:block' />
    </div>
    <div className='px-4 pb-3 pt-3 lg:border-t lg:border-gray-100 lg:px-5'>
      <TextLine
        line='h-4 mb-2'
        className='w-24'
      />
      <div className='grid grid-cols-1 lg:grid-flow-col lg:grid-cols-2 lg:grid-rows-3 lg:gap-x-10'>
        {["w-40", "w-32", "w-48", "w-36", "w-44", "w-28"].map(
          (width, index) => (
            <div
              key={width}
              className={cn(
                "flex h-9 items-center gap-3 border-t border-gray-100",
                index >= 3 && "max-sm:hidden",
              )}>
              <Skeleton className='h-2.5 w-16 shrink-0' />
              <Skeleton className={cn("h-3", width)} />
            </div>
          ),
        )}
      </div>
    </div>
  </div>
);

// The office list: one office card per row.
const OfficeSiteSkeleton = () => (
  <SkeletonRegion
    label='Loading offices'
    className='grid grid-cols-1 gap-4'>
    {Array.from({ length: 3 }, (_, index) => (
      <OfficeCardSkeleton key={index} />
    ))}
  </SkeletonRegion>
);

export default OfficeSiteSkeleton;

// The offices page before it mounts: the filters over the office cards.
export const OfficeSitePageSkeleton = () => (
  <div className='mt-8'>
    <FilterBarSkeleton
      search='sm:w-72'
      selects={["w-28", "w-28", "w-28"]}
      className='mb-6'
    />
    <OfficeSiteSkeleton />
  </div>
);

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

// Mirrors OfficeCard: icon, name and status, the meta line; then the
// totals beside a grid of the newest sites.
const OfficeCardSkeleton = () => (
  <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
    <div className='flex items-start gap-3 px-4 py-4 lg:px-5'>
      <Skeleton className='size-10 shrink-0 rounded-lg' />
      <div className='min-w-0 flex-1'>
        <div className='flex h-[22.5px] items-center gap-2.5'>
          <Skeleton className='h-4 w-56 max-w-[60%]' />
          <Skeleton className='h-5 w-14 rounded-full' />
        </div>
        <div className='mt-1 flex h-4 flex-wrap items-center gap-4 overflow-hidden'>
          {["w-28", "w-36", "w-52", "w-24"].map((width) => (
            <Skeleton
              key={width}
              className={cn("h-3", width)}
            />
          ))}
        </div>
      </div>
      <Skeleton className='hidden h-6 w-24 rounded-full sm:block' />
    </div>
    <div className='grid border-t border-gray-100 lg:grid-cols-[13rem_minmax(0,1fr)]'>
      <div className='grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/70 lg:grid-cols-1 lg:content-start lg:divide-x-0 lg:divide-y lg:border-b-0 lg:border-r'>
        {["w-10", "w-16", "w-20"].map((width) => (
          <div
            key={width}
            className='px-4 py-3 lg:flex lg:items-center lg:justify-between lg:px-5 lg:py-2.5'>
            <TextLine
              line='h-[16.5px] lg:h-4'
              className={cn("h-2.5", width)}
            />
            <TextLine
              line='h-[22.5px]'
              className='h-4 w-8'
            />
          </div>
        ))}
      </div>
      <div className='p-4 lg:px-5'>
        <TextLine
          line='mb-2.5 h-4'
          className='w-24'
        />
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'>
          {["w-36", "w-28", "w-40", "w-32", "w-36", "w-28"].map(
            (width, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border border-gray-200 px-3 py-2.5",
                  index >= 3 && "max-sm:hidden",
                )}>
                <Skeleton className='mt-1.5 size-2 rounded-full' />
                <div className='min-w-0 flex-1'>
                  <TextLine className={cn("h-3.5", width)} />
                  <TextLine
                    line='mt-0.5 h-4'
                    className='h-2.5 w-32'
                  />
                </div>
              </div>
            ),
          )}
        </div>
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

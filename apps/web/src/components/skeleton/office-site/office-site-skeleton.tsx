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

// Mirrors OfficeCard: icon, name and place, status and menu; the three
// totals; the manager and email; then when it was added.
const OfficeCardSkeleton = () => (
  <div className='flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm'>
    <div className='flex items-start gap-3 px-4 pt-4'>
      <Skeleton className='size-8 shrink-0 rounded-lg' />
      <div className='min-w-0 flex-1'>
        <TextLine className='h-3.5 w-48 max-w-full' />
        <TextLine
          line='mt-0.5 h-4'
          className='w-32'
        />
      </div>
      <Skeleton className='h-5 w-14 shrink-0 rounded-full' />
    </div>
    <div className='mt-4 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200 bg-gray-50/60'>
      {["w-8", "w-6", "w-6"].map((width, index) => (
        <div
          key={index}
          className='px-4 py-2.5'>
          <TextLine
            line='h-[16.5px]'
            className='h-2.5 w-14'
          />
          <TextLine
            line='h-5'
            className={cn("h-4", width)}
          />
          <TextLine
            line='h-4'
            className='h-2.5 w-12'
          />
        </div>
      ))}
    </div>
    <div className='space-y-1.5 px-4 py-3'>
      <TextLine
        line='h-4'
        className='w-40'
      />
      <TextLine
        line='h-4'
        className='w-52'
      />
    </div>
    <div className='flex items-center justify-between border-t border-gray-100 px-4 py-2.5'>
      <TextLine
        line='h-4'
        className='w-32'
      />
      <TextLine
        line='h-4'
        className='w-20'
      />
    </div>
  </div>
);

// The office list: a grid of office cards.
const OfficeSiteSkeleton = () => (
  <SkeletonRegion
    label='Loading offices'
    className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
    {Array.from({ length: 6 }, (_, index) => (
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

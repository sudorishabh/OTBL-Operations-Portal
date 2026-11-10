import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterBarSkeleton,
  SkeletonRegion,
  TableSkeleton,
  type SkeletonColumn,
} from "../parts";

// Same columns as OfficeSiteTable.
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

// An office's sites table while its first six sites load.
export const OfficeSitesTableSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <SkeletonRegion label='Loading sites'>
    <SitesTable rows={rows} />
  </SkeletonRegion>
);

// Mirrors OfficeCard: name and status, manager and operators, the actions,
// then the sites table.
const OfficeCardSkeleton = () => (
  <div className='rounded-xl border border-gray-50 bg-white p-3 shadow-sm sm:p-4'>
    <div className='mb-4 flex flex-col gap-4 border-b border-gray-100 pb-4 lg:flex-row lg:items-start lg:justify-between'>
      <div className='min-w-0'>
        <div className='flex h-5 items-center gap-2'>
          <Skeleton className='h-4 w-56' />
          <Skeleton className='h-5 w-14 rounded-full' />
        </div>
        <div className='mt-1.5 flex h-5 items-center gap-3'>
          <Skeleton className='h-3 w-10' />
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-3 w-28' />
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2 lg:shrink-0'>
        <Skeleton className='h-8 w-20' />
        <div className='mx-0.5 hidden h-6 w-px bg-gray-200 lg:block' />
        <Skeleton className='size-8 rounded-full' />
        <Skeleton className='h-8 w-16' />
        <Skeleton className='h-8 w-24' />
        <Skeleton className='h-8 w-28' />
      </div>
    </div>
    <SitesTable rows={3} />
  </div>
);

export const OfficeCardLoading = () => (
  <SkeletonRegion label='Loading office'>
    <OfficeCardSkeleton />
  </SkeletonRegion>
);

// The office list: a card for each office with its sites.
const OfficeSiteSkeleton = () => (
  <SkeletonRegion
    label='Loading offices'
    className='grid grid-cols-1 gap-4'>
    <OfficeCardSkeleton />
    <OfficeCardSkeleton />
    <OfficeCardSkeleton />
  </SkeletonRegion>
);

export default OfficeSiteSkeleton;

// The offices page before it mounts: the filters over the office cards.
export const OfficeSitePageSkeleton = () => (
  <div className='mt-8'>
    <FilterBarSkeleton
      search='sm:w-72'
      selects={["w-28", "w-28", "w-28", "w-28"]}
      className='mb-6'
    />
    <OfficeSiteSkeleton />
  </div>
);

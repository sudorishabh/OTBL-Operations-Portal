"use client";
import React from "react";
import { ClipboardList, MapPinned } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { useIsAdmin } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DetailCardSkeleton,
  PageHeaderSkeleton,
  SectionHeaderSkeleton,
  SkeletonRegion,
  TableSkeleton,
  TextLine,
  type SkeletonColumn,
} from "../parts";
import { OfficeSitesTableSkeleton } from "./office-site-skeleton";

export const OFFICE_PAGE_DESCRIPTION =
  "Office details, members, sites and work orders";

// Classes the office's work orders table uses.
const HEAD = "h-9 px-4 text-xs font-medium text-gray-500";
const CELL = "px-4 py-2.5";

const WORK_ORDER_COLUMNS: SkeletonColumn[] = [
  {
    label: "Work order",
    headClassName: HEAD,
    cellClassName: CELL,
    bar: ["w-64", "w-56", "w-72"],
    sub: ["w-48", "w-40", "w-52"],
  },
  {
    label: "Client",
    headClassName: HEAD,
    cellClassName: CELL,
    bar: ["w-40", "w-32", "w-44"],
  },
  { label: "Period", headClassName: HEAD, cellClassName: CELL, bar: "w-44" },
  {
    label: "Status",
    headClassName: HEAD,
    cellClassName: CELL,
    shape: "pill",
  },
  {
    headClassName: `${HEAD} w-10`,
    cellClassName: `${CELL} pr-3`,
    bar: "w-4",
  },
];

// The office's work orders while their first page loads.
export const OfficeWorkOrdersTableSkeleton = ({
  rows = 3,
}: {
  rows?: number;
}) => (
  <SkeletonRegion label='Loading work orders'>
    <TableSkeleton
      columns={WORK_ORDER_COLUMNS}
      rows={rows}
      className='border-gray-200'
      headRowClassName='bg-gray-50'
      rowClassName='h-[61px]'
    />
  </SkeletonRegion>
);

// Mirrors OfficeDetailsCard: identity, four figures, then the fields with
// the address spanning two columns.
export const OfficeInfoSkeleton = () => (
  <SkeletonRegion label='Loading office'>
    <DetailCardSkeleton
      pills={1}
      buttons={0}
      metrics={4}
      metricsClassName='lg:grid-cols-4 lg:divide-y-0'
      fields={["", "", "", "", "col-span-2"]}
      fieldsClassName='sm:grid-cols-4 xl:grid-cols-6'
    />
  </SkeletonRegion>
);

// A search field and selects inside a white section; `selects` holds each
// select's width from the sm breakpoint up.
const SectionFilters = ({ selects }: { selects: string[] }) => (
  <div className='mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center'>
    <Skeleton className='col-span-2 h-8 w-full sm:w-72' />
    {selects.map((width, index) => (
      <Skeleton
        key={index}
        className={cn("h-8 w-full", width)}
      />
    ))}
  </div>
);

const MemberCardSkeleton = () => (
  <div className='flex items-start gap-3 rounded-lg border border-gray-200 px-4 py-3'>
    <Skeleton className='size-9 shrink-0 rounded-full' />
    <div className='min-w-0 flex-1'>
      <TextLine className='h-3.5 w-36' />
      <TextLine
        line='h-4'
        className='w-24'
      />
      <TextLine
        line='mt-1.5 h-4'
        className='w-48'
      />
      <TextLine
        line='mt-0.5 h-4'
        className='w-28'
      />
    </div>
  </div>
);

// The tabs over the office's sites and work orders; sites open first.
const TABS = [
  { label: "Sites", Icon: MapPinned },
  { label: "Work orders", Icon: ClipboardList },
];

// An office's page below its title: the details card, members, then the
// sites and work orders tabs.
export const OfficePageContentSkeleton = () => {
  const isAdmin = useIsAdmin();

  return (
    <div className='mt-4 space-y-4'>
      <OfficeInfoSkeleton />

      <SkeletonRegion label='Loading members'>
        <section className='rounded-lg border bg-white p-4 sm:p-6'>
          <SectionHeaderSkeleton
            title='Members'
            actions={isAdmin ? 1 : 0}
          />
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>
            <MemberCardSkeleton />
            <MemberCardSkeleton />
          </div>
        </section>
      </SkeletonRegion>

      <SkeletonRegion label='Loading sites and work orders'>
        <section className='rounded-lg border bg-white'>
          <div className='flex flex-wrap items-center justify-between gap-x-4 border-b border-gray-200 px-4 sm:px-6'>
            <div className='flex gap-6'>
              {TABS.map(({ label, Icon }, index) => (
                <div
                  key={label}
                  className={cn(
                    "-mb-px flex items-center gap-2 border-b-2 px-0.5 py-3 text-sm font-medium",
                    index === 0
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500",
                  )}>
                  <Icon className='size-4' />
                  {label}
                  <Skeleton className='h-4 w-6 rounded-full' />
                </div>
              ))}
            </div>
            {isAdmin && <Skeleton className='my-2 h-8 w-28' />}
          </div>
          <div className='p-4 sm:p-6'>
            <SectionFilters selects={["sm:w-28"]} />
            <OfficeSitesTableSkeleton rows={3} />
          </div>
        </section>
      </SkeletonRegion>
    </div>
  );
};

// An office's page before its details load, on the backdrop the page draws.
const OfficePageSkeleton = () => {
  const isAdmin = useIsAdmin();

  return (
    <PageWrapper>
      <PageHeaderSkeleton
        back
        description={OFFICE_PAGE_DESCRIPTION}
        action={isAdmin}
      />
      <OfficePageContentSkeleton />
    </PageWrapper>
  );
};

export default OfficePageSkeleton;

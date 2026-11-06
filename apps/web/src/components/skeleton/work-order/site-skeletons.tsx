import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import {
  PageHeaderSkeleton,
  SkeletonCard,
  SkeletonRegion,
  TableSkeleton,
  TextLine,
  type SkeletonColumn,
} from "../parts";

// A file box from the document sections: a saved file over the upload row.
const DocumentBoxSkeleton = () => (
  <div className='divide-y divide-gray-100 rounded-lg border border-gray-200'>
    <div className='flex h-9 items-center gap-2 px-3'>
      <Skeleton className='size-4 shrink-0' />
      <Skeleton className='h-3 w-32' />
      <Skeleton className='ml-auto h-2.5 w-10' />
    </div>
    <div className='flex h-9 items-center gap-2 px-3'>
      <Skeleton className='size-4 shrink-0' />
      <Skeleton className='h-3 w-48' />
      <Skeleton className='ml-auto h-2.5 w-12' />
    </div>
  </div>
);

// The 0-day bio sample's row: TPH, report link, date and delete.
export const SampleRowSkeleton = () => (
  <SkeletonRegion
    label='Loading the sample'
    className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2'>
    <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5'>
      <Skeleton className='h-5 w-20 rounded-full' />
      <Skeleton className='h-3 w-20' />
      <Skeleton className='h-3 w-24' />
    </div>
    <Skeleton className='size-6' />
  </SkeletonRegion>
);

// Groups of expenses, each a heading over its order's rows, as the
// expenses section lists them.
export const ExpenseGroupsSkeleton = () => (
  <SkeletonRegion
    label='Loading expenses'
    className='space-y-5'>
    {[3, 2].map((rows, group) => (
      <div
        key={group}
        className='space-y-2'>
        <div className='flex h-5 items-center gap-2'>
          <Skeleton className='size-3.5' />
          <Skeleton className='h-3 w-28' />
          <Skeleton className='h-2.5 w-20' />
          <Skeleton className='ml-auto h-3.5 w-24' />
        </div>
        <div className='overflow-hidden rounded-lg border border-gray-200'>
          <div className='flex items-center gap-3 bg-gray-50/60 px-4 py-2.5'>
            <Skeleton className='h-5 w-24' />
            <Skeleton className='h-3.5 w-40' />
            <Skeleton className='ml-auto h-3.5 w-20' />
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className='flex items-center gap-6 border-t border-gray-100 px-4 py-3'>
              <Skeleton className='h-3 w-24 shrink-0' />
              <div className='min-w-0 flex-1 space-y-1.5'>
                <Skeleton className='h-3.5 w-56 max-w-full' />
                <Skeleton className='h-3 w-32' />
              </div>
              <Skeleton className='hidden h-3 w-28 md:block' />
              <Skeleton className='hidden h-3 w-20 lg:block' />
              <Skeleton className='h-3.5 w-20' />
            </div>
          ))}
        </div>
      </div>
    ))}
  </SkeletonRegion>
);

const ACTIVITY_HEAD = "font-semibold text-slate-600";

const ACTIVITY_COLUMNS: SkeletonColumn[] = [
  {
    label: "Type",
    headClassName: `w-[140px] pl-4 ${ACTIVITY_HEAD}`,
    cellClassName: "pl-4",
    bar: "w-20",
    sub: "w-12",
  },
  {
    label: "Key Metric",
    headClassName: `text-center ${ACTIVITY_HEAD}`,
    shape: "pill",
    bar: ["w-20", "w-24"],
    align: "center",
  },
  {
    label: "Month",
    headClassName: `text-center ${ACTIVITY_HEAD}`,
    bar: "w-16",
    align: "center",
  },
  {
    label: "Document",
    headClassName: `w-[150px] text-center ${ACTIVITY_HEAD}`,
    bar: "w-16",
    align: "center",
  },
  {
    label: "Date",
    headClassName: `w-[120px] text-center ${ACTIVITY_HEAD}`,
    bar: "w-20",
    align: "center",
  },
  { headClassName: "w-[50px]", bar: "w-4", align: "center" },
];

// The bio samples and oil zapping table of a bioremediation site.
export const ActivitiesSkeleton = () => (
  <SkeletonRegion
    label='Loading activities'
    className='space-y-6'>
    <div className='mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row'>
      <div>
        <p className='text-sm font-semibold tracking-wide text-slate-700'>
          Bioremediation Activities
        </p>
        <p className='text-xs text-slate-500'>
          Enter bio samples and oil zapping activities for this site.
        </p>
      </div>
      <div className='flex items-center gap-3'>
        <Skeleton className='h-8 w-[140px]' />
        <Skeleton className='h-8 w-36' />
        <Skeleton className='h-8 w-36' />
      </div>
    </div>
    <TableSkeleton
      columns={ACTIVITY_COLUMNS}
      rows={6}
      className='mt-4 border-slate-200'
      headRowClassName='bg-slate-50/80'
      rowClassName='h-[52px]'
    />
  </SkeletonRegion>
);

// The operators row shared by the site and restoration pages.
const OperatorsRowSkeleton = () => (
  <div className='flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-5 py-4'>
    <div className='flex items-center gap-3'>
      <Skeleton className='h-3 w-24' />
      <Skeleton className='h-5 w-28 rounded-full' />
      <Skeleton className='h-5 w-24 rounded-full' />
    </div>
    <Skeleton className='h-8 w-24' />
  </div>
);

// A site's page: the site information card with its estimate and document
// stages, what is left to draw on, then the activities and expenses.
export const SiteDetailsSkeleton = () => (
  <PageWrapper>
    <SkeletonRegion label='Loading site'>
      <PageHeaderSkeleton back />
      <div className='mt-4 space-y-4'>
        <SkeletonCard>
          <div className='px-5 py-4'>
            <div className='flex h-5 items-center gap-2'>
              <p className='text-sm font-semibold text-gray-900'>
                Site information
              </p>
              <Skeleton className='h-4 w-16 rounded-full' />
            </div>
            <div className='mt-1 flex h-4 items-center gap-4'>
              <Skeleton className='h-3 w-28' />
              <Skeleton className='h-3 w-64 max-w-full' />
            </div>
          </div>
          <OperatorsRowSkeleton />
          <div className='border-t border-gray-100 px-5 py-4'>
            <div className='flex items-center justify-between gap-3'>
              <TextLine
                line='h-5'
                className='w-72 max-w-full'
              />
              <Skeleton className='h-8 w-16' />
            </div>
            <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
              <DocumentBoxSkeleton />
              <div className='divide-y divide-gray-100 rounded-lg border border-gray-200'>
                <div className='flex h-9 items-center px-3'>
                  <Skeleton className='h-2.5 w-full' />
                </div>
                <div className='flex h-9 items-center px-3'>
                  <Skeleton className='h-3 w-full' />
                </div>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 border-t border-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-gray-100'>
            {[0, 1].map((stage) => (
              <div
                key={stage}
                className='space-y-3 px-5 py-4'>
                <TextLine
                  line='h-5'
                  className='w-64 max-w-full'
                />
                <div className='grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2'>
                  {[0, 1].map((box) => (
                    <div
                      key={box}
                      className='space-y-2'>
                      <TextLine
                        line='h-5'
                        className='w-40'
                      />
                      <DocumentBoxSkeleton />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className='space-y-3 p-5'>
          <div>
            <p className='text-sm font-semibold text-gray-900'>Availability</p>
            <p className='text-xs text-gray-500'>
              What is left for this site to draw on.
            </p>
          </div>
          {["h-[68px]", "h-24", "h-28"].map((height, index) => (
            <Skeleton
              key={index}
              className={`w-full rounded-lg bg-gray-100 ${height}`}
            />
          ))}
        </SkeletonCard>

        <SkeletonCard className='p-5'>
          <ActivitiesSkeleton />
        </SkeletonCard>
      </div>
    </SkeletonRegion>
  </PageWrapper>
);

// The restoration page: its information card, the dialog buttons, the
// completion certificate, then the expenses by job order.
export const RestorationPageSkeleton = () => (
  <PageWrapper>
    <SkeletonRegion label='Loading restoration'>
      <PageHeaderSkeleton
        back
        title='Restoration'
      />
      <div className='mt-4 space-y-4'>
        <SkeletonCard>
          <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4'>
            <div className='flex min-w-0 flex-1 items-center gap-3'>
              <Skeleton className='size-8 shrink-0 rounded-lg' />
              <div className='min-w-0 flex-1'>
                <div className='flex h-6 items-center gap-2'>
                  <p className='text-base font-semibold text-gray-900'>
                    Restoration information
                  </p>
                  <Skeleton className='h-5 w-16 rounded-full' />
                </div>
                <TextLine
                  line='mt-0.5 h-4'
                  className='w-64'
                />
                <TextLine
                  line='mt-0.5 h-4'
                  className='w-[32rem] max-w-full'
                />
              </div>
            </div>
            <Skeleton className='h-7 w-40' />
          </div>
          <OperatorsRowSkeleton />
        </SkeletonCard>

        <div className='flex flex-wrap justify-end gap-2'>
          <Skeleton className='h-8 w-44 bg-white/80' />
          <Skeleton className='h-8 w-48 bg-white/80' />
        </div>

        <SkeletonCard className='space-y-2 p-4'>
          <TextLine
            line='h-5'
            className='w-80 max-w-full'
          />
          <DocumentBoxSkeleton />
        </SkeletonCard>

        <SkeletonCard className='space-y-4 p-5'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-1'>
              <TextLine
                line='h-5'
                className='h-3.5 w-36'
              />
              <TextLine
                line='h-4'
                className='w-56'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Skeleton className='h-8 w-44' />
              <Skeleton className='h-8 w-32' />
            </div>
          </div>
          <ExpenseGroupsSkeleton />
        </SkeletonCard>
      </div>
    </SkeletonRegion>
  </PageWrapper>
);

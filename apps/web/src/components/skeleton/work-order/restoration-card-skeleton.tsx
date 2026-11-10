import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineSkeleton, SkeletonRegion, TextLine } from "../parts";

// Mirrors RestorationCard. The activities come from the schedule of rates,
// which the page already has, so their names show while the rest loads.
const RestorationCardSkeleton = ({ labels }: { labels: string[] }) => (
  <SkeletonRegion label='Loading restoration'>
    <section className='rounded-lg border border-gray-200 bg-white'>
      <div className='flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 pb-5 pt-6'>
        <div className='flex min-w-0 items-center gap-3'>
          <Skeleton className='size-8 shrink-0 rounded-lg' />
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <p className='text-base font-semibold text-gray-900'>
                Restoration
              </p>
              <Skeleton className='h-5 w-16 rounded-full' />
            </div>
            <p className='mt-0.5 flex items-center gap-x-3 text-xs text-gray-500'>
              <span>Across the whole work order</span>
              <InlineSkeleton className='w-28' />
            </p>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <div className='w-56'>
            <TextLine
              line='h-[22.5px] sm:justify-end'
              className='h-3.5 w-48'
            />
            <Skeleton className='mt-1.5 h-1 w-full rounded-full' />
          </div>
          <Skeleton className='ml-auto size-4 shrink-0' />
        </div>
      </div>

      {labels.length > 0 && (
        <ol className='divide-y divide-gray-100 border-t border-gray-100 lg:grid lg:auto-cols-fr lg:grid-flow-col lg:divide-x lg:divide-y-0'>
          {labels.map((label, index) => (
            <li
              key={index}
              className='flex items-center gap-3 px-6 py-3 lg:block lg:py-4'>
              <p className='flex min-w-0 flex-1 gap-1.5 text-xs font-medium leading-4 text-gray-700 lg:min-h-8'>
                <span className='tabular-nums text-gray-400'>{index + 1}</span>
                <span className='line-clamp-2'>{label}</span>
              </p>
              <Skeleton className='hidden h-1.5 w-28 shrink-0 rounded-full sm:block lg:mt-2 lg:w-auto' />
              <TextLine
                line='h-[16.5px] shrink-0 justify-end sm:w-32 lg:mt-1.5 lg:w-auto lg:justify-start'
                className='h-2.5 w-24'
              />
            </li>
          ))}
        </ol>
      )}

      <div className='flex flex-wrap items-center gap-x-5 gap-y-1 rounded-b-lg border-t border-gray-100 bg-gray-50/60 px-6 py-3'>
        <TextLine
          line='h-4'
          className='w-24'
        />
        <TextLine
          line='h-4'
          className='w-96 max-w-full'
        />
        <TextLine
          line='h-4 sm:ml-auto'
          className='w-36'
        />
      </div>
    </section>
  </SkeletonRegion>
);

export default RestorationCardSkeleton;

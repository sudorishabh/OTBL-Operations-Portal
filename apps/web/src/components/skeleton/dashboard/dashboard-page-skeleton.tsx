import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardPageSkeleton = () => {
  return (
    <div className='mt-3 space-y-3'>
      {/* Scope + figures + shortcuts card. */}
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='flex items-center gap-2.5 px-4 py-2.5'>
          <Skeleton className='size-8 shrink-0 rounded-lg' />
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Skeleton className='h-3.5 w-28' />
            <Skeleton className='h-3 w-56 max-w-full' />
          </div>
          <Skeleton className='h-5 w-16 shrink-0' />
        </div>

        <div className='grid grid-cols-2 divide-x divide-y divide-gray-200 border-y border-gray-200 bg-gray-50/60 sm:grid-cols-4 lg:grid-cols-8 lg:divide-y-0'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='space-y-1.5 px-3 py-2'>
              <Skeleton className='h-2.5 w-14' />
              <Skeleton className='h-5 w-10' />
            </div>
          ))}
        </div>

        <div className='flex flex-wrap items-center gap-1.5 px-4 py-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className='h-6 w-24'
            />
          ))}
        </div>
      </div>

      {/* Recent work orders card. */}
      <div className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
        <div className='flex items-center justify-between border-b border-gray-200 px-4 py-2'>
          <Skeleton className='h-3.5 w-36' />
          <Skeleton className='h-3.5 w-16' />
        </div>
        <div className='space-y-1.5 p-3'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              className='h-7 w-full'
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPageSkeleton;

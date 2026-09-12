import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const FieldSkeleton = ({
  className,
  lines = 1,
}: {
  className?: string;
  lines?: 1 | 2;
}) => (
  <div className={className}>
    <Skeleton className='h-2.5 w-16 bg-gray-200/70' />
    <Skeleton className='mt-2 h-3.5 w-4/5 bg-gray-200/70' />
    {lines === 2 && <Skeleton className='mt-1.5 h-3 w-3/5 bg-gray-200/70' />}
  </div>
);

export const CardSkeleton = () => (
  <div className='rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm'>
    <div className='flex items-start gap-3'>
      <Skeleton className='h-10 w-10 shrink-0 rounded-lg bg-gray-200/70' />

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2.5'>
          <Skeleton className='h-4 w-48 bg-gray-200/70' />
          <Skeleton className='h-4 w-16 rounded-full bg-gray-200/70' />
        </div>
        <Skeleton className='mt-2 h-3 w-44 bg-gray-200/70' />
      </div>

      <Skeleton className='h-8 w-8 shrink-0 rounded-full bg-gray-200/70' />
    </div>

    <div className='mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-4 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)]'>
      <FieldSkeleton
        lines={2}
        className='col-span-2 sm:col-span-1'
      />
      <FieldSkeleton
        lines={2}
        className='col-span-2 sm:col-span-1'
      />
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
    </div>
  </div>
);

const ClientsSkeleton = () => {
  return (
    <div className='flex flex-col gap-4'>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
};

export default ClientsSkeleton;

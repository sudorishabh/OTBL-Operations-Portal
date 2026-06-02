import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const CardSkeleton = () => (
  <div className='bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-6.5'>
    <div className='flex items-center gap-6'>
      <div className='shrink-0 w-72 space-y-2'>
        <Skeleton className='h-5 w-48 bg-gray-200/70' />
        <Skeleton className='h-3 w-28 bg-gray-200/70' />
        <div className='flex items-center gap-2 pt-0.5'>
          <Skeleton className='h-4 w-16 rounded-full bg-gray-200/70' />
          <Skeleton className='h-3 w-16 bg-gray-200/70' />
        </div>
      </div>

      <div className='h-16 w-px bg-gray-100 shrink-0' />

      <div className='flex-1 grid grid-cols-2 gap-6'>
        <div className='space-y-2'>
          <Skeleton className='h-3 w-20 bg-gray-200/70' />
          <Skeleton className='h-4 w-full bg-gray-200/70' />
          <Skeleton className='h-3 w-32 bg-gray-200/70' />
        </div>
        <div className='space-y-2'>
          <Skeleton className='h-3 w-16 bg-gray-200/70' />
          <Skeleton className='h-4 w-36 bg-gray-200/70' />
          <Skeleton className='h-3 w-40 bg-gray-200/70' />
        </div>
      </div>

      <div className='shrink-0'>
        <Skeleton className='h-8 w-8 rounded-full bg-gray-200/70' />
      </div>
    </div>

    <div className='mt-4 pt-4 border-t border-gray-100'>
      <div className='grid grid-cols-3 gap-2'>
        <Skeleton className='h-[52px] rounded-lg bg-gray-100' />
        <Skeleton className='h-[52px] rounded-lg bg-gray-100' />
        <Skeleton className='h-[52px] rounded-lg bg-gray-100' />
      </div>
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

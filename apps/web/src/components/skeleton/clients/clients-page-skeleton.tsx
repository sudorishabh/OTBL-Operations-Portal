import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CardSkeleton } from "./clients-skeleton";

const ClientsPageSkeleton = () => {
  return (
    <div className='space-y-4 mt-8'>
      {/* Search filter + tab toggle row */}
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-8 w-56 bg-gray-200/70' />
          <Skeleton className='h-8 w-20 bg-gray-200/70' />
        </div>
        <Skeleton className='h-8 w-40 bg-gray-200/70 mr-4' />
      </div>

      {/* Card skeletons */}
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
};

export default ClientsPageSkeleton;

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { skeletonStyle, skeletonsParentStyle } from "@/styles";

const DashboardPageSkeleton = () => {
  return (
    <div className={cn(skeletonsParentStyle, "mt-4 pr-4")}>
      <Skeleton className={cn(skeletonStyle, "h-9")} />

      <div>
        <Skeleton className='h-3.5 w-20 bg-white' />
        <div className='mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(skeletonStyle, "h-[68px]")}
            />
          ))}
        </div>
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <Skeleton className={cn(skeletonStyle, "h-64 lg:col-span-2")} />
        <Skeleton className={cn(skeletonStyle, "h-40")} />
      </div>
    </div>
  );
};

export default DashboardPageSkeleton;

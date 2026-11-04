import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { skeletonStyleGray } from "@/styles";
import { cn } from "@/lib/utils";

// The proposals section: its header, then a few proposal rows.
const ClientProposalSkeleton = () => {
  return (
    <div className='space-y-4 rounded-lg border bg-white p-6'>
      <div className='flex items-center gap-3'>
        <Skeleton className={cn(skeletonStyleGray, "size-8 shrink-0")} />
        <Skeleton className={cn(skeletonStyleGray, "h-8 w-64")} />
      </div>
      <div className='space-y-2'>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className={cn(skeletonStyleGray, "h-14")}
          />
        ))}
      </div>
    </div>
  );
};

export default ClientProposalSkeleton;

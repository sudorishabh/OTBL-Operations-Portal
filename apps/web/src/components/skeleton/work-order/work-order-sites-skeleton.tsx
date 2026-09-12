import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { skeletonsParentStyle, skeletonStyle } from "@/styles";
import { cn } from "@/lib/utils";

const WorkOrderSitesSkeleton = () => {
  return (
    <div
      className={cn(
        skeletonsParentStyle,
        "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
      )}>
      <Skeleton className={cn(skeletonStyle, "h-40")} />
      <Skeleton className={cn(skeletonStyle, "h-40")} />
      <Skeleton className={cn(skeletonStyle, "h-40")} />
    </div>
  );
};

export default WorkOrderSitesSkeleton;

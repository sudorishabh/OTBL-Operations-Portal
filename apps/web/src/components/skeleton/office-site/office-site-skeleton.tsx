import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { skeletonStyle, skeletonsParentStyle } from "@/styles";
import React from "react";

const OfficeSiteSkeleton = () => {
  return (
    <div className={skeletonsParentStyle}>
      <Skeleton className={cn(skeletonStyle, "h-64")} />
      <Skeleton className={cn(skeletonStyle, "h-64")} />
    </div>
  );
};

export default OfficeSiteSkeleton;

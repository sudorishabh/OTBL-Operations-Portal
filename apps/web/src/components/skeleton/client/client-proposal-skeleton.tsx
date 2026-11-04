import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { skeletonsParentStyle, skeletonStyle } from "@/styles";
import { cn } from "@/lib/utils";

const ClientProposalSkeleton = () => {
  return (
    <div className={skeletonsParentStyle}>
      <Skeleton className={cn(skeletonStyle, "h-60")} />
      <Skeleton className={cn(skeletonStyle, "h-16")} />
    </div>
  );
};

export default ClientProposalSkeleton;

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { skeletonsParentStyle, skeletonStyle } from "@/styles";
import { cn } from "@/lib/utils";

// One block for the details card: identity, metrics and fields.
const ClientInfoSkeleton = () => {
  return (
    <div className={skeletonsParentStyle}>
      <Skeleton className={cn(skeletonStyle, "h-60")} />
    </div>
  );
};

export default ClientInfoSkeleton;

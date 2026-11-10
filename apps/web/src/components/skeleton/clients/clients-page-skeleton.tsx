"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/contexts/AuthContext";
import { FilterBarSkeleton, ON_PAGE, SkeletonRegion } from "../parts";
import { ClientGroupSkeleton } from "./clients-skeleton";

// The clients page before it mounts: the tabs, filters and the client list.
const ClientsPageSkeleton = () => {
  const isAdmin = useIsAdmin();
  return (
    <SkeletonRegion
      label='Loading clients'
      className='mt-8 space-y-4'>
      <div className='mb-4 space-y-3'>
        <Skeleton className={`h-8 w-64 ${ON_PAGE}`} />
        <FilterBarSkeleton
          search='sm:w-72'
          selects={["w-28", "w-36", "w-28", "w-28"]}
        />
      </div>
      {[1, 2, 1, 1].map((branches, index) => (
        <ClientGroupSkeleton
          key={index}
          branches={branches}
          isAdmin={isAdmin}
        />
      ))}
    </SkeletonRegion>
  );
};

export default ClientsPageSkeleton;

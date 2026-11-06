"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/contexts/AuthContext";
import { FilterBarSkeleton, ON_PAGE, SkeletonRegion } from "../parts";
import { ClientGroupSkeleton } from "./clients-skeleton";

// The clients page before it mounts: filters, the tabs and the client list.
const ClientsPageSkeleton = () => {
  const isAdmin = useIsAdmin();
  return (
    <SkeletonRegion
      label='Loading clients'
      className='mt-8 space-y-4'>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <FilterBarSkeleton
          search='sm:w-80'
          selects={["w-[140px]"]}
        />
        <Skeleton
          className={`h-8 w-64 self-start sm:mr-4 sm:self-auto ${ON_PAGE}`}
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

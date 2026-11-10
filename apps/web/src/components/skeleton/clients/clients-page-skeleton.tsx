"use client";
import React from "react";
import { useIsAdmin } from "@/contexts/AuthContext";
import { FilterBarSkeleton, SkeletonRegion } from "../parts";
import { ClientGroupSkeleton } from "./clients-skeleton";

// The clients page before it mounts: the filters and the client list.
const ClientsPageSkeleton = () => {
  const isAdmin = useIsAdmin();
  return (
    <SkeletonRegion
      label='Loading clients'
      className='mt-8 space-y-4'>
      <FilterBarSkeleton
        search='sm:w-72'
        selects={["w-28", "w-36", "w-28", "w-28"]}
        className='mb-4'
      />
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

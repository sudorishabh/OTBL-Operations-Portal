import React from "react";
import { FilterBarSkeleton, SkeletonRegion } from "../parts";
import { UsersTableSkeleton } from "./user-tab-skeleton";

// The user page before it mounts: the filters and the table.
const UserPageSkeleton = () => (
  <SkeletonRegion
    label='Loading users'
    className='mt-8'>
    <FilterBarSkeleton
      search='sm:w-72'
      selects={["w-28", "w-28", "w-28", "w-32", "w-28"]}
      className='mb-4'
    />
    <UsersTableSkeleton />
  </SkeletonRegion>
);

export default UserPageSkeleton;

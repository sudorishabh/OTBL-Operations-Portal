import React from "react";
import { FilterBarSkeleton, SkeletonRegion, TableSkeleton } from "../parts";
import { USER_COLUMNS } from "./user-tab-skeleton";

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
    <TableSkeleton
      columns={USER_COLUMNS}
      rows={10}
      rowClassName='h-16'
    />
  </SkeletonRegion>
);

export default UserPageSkeleton;

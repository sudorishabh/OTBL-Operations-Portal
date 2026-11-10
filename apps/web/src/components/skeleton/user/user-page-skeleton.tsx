import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterBarSkeleton,
  ON_PAGE,
  SkeletonRegion,
  TableSkeleton,
} from "../parts";
import { USER_COLUMNS } from "./user-tab-skeleton";

// The user page before it mounts: the view tabs, filters and the table.
const UserPageSkeleton = () => (
  <SkeletonRegion
    label='Loading users'
    className='mt-8'>
    <div className='mb-4 space-y-3'>
      <Skeleton className={`h-8 w-40 ${ON_PAGE}`} />
      <FilterBarSkeleton
        search='sm:w-72'
        selects={["w-28", "w-28", "w-28", "w-32", "w-28"]}
      />
    </div>
    <TableSkeleton
      columns={USER_COLUMNS}
      rows={10}
      rowClassName='h-16'
    />
  </SkeletonRegion>
);

export default UserPageSkeleton;

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FilterBarSkeleton,
  ON_PAGE,
  SkeletonRegion,
  TableSkeleton,
} from "../parts";
import { USER_COLUMNS } from "./user-tab-skeleton";

// The user page before it mounts: filters, the view tabs and the table.
const UserPageSkeleton = () => (
  <SkeletonRegion
    label='Loading users'
    className='mt-8'>
    <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
      <FilterBarSkeleton
        search='sm:w-80'
        selects={["w-[140px]", "w-[140px]"]}
      />
      <Skeleton className={`h-8 w-40 self-start sm:self-auto ${ON_PAGE}`} />
    </div>
    <TableSkeleton
      columns={USER_COLUMNS}
      rows={10}
      rowClassName='h-16'
    />
  </SkeletonRegion>
);

export default UserPageSkeleton;

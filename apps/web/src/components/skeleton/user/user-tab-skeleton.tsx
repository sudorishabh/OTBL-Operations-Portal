import React from "react";
import { SkeletonRegion, TableSkeleton, type SkeletonColumn } from "../parts";
import {
  LIST_CELL,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_ROW,
} from "@/components/shared/list-table";

// Same columns as UserTable.
export const USER_COLUMNS: SkeletonColumn[] = (
  [
    {
      label: "Name",
      bar: ["w-24", "w-28", "w-20", "w-32"],
      sub: ["w-24", "w-16", "w-24", "w-20"],
    },
    { label: "Contact", bar: ["w-36", "w-40", "w-32"], sub: "w-20" },
    {
      label: "Offices / Sites",
      shape: "pill",
      bar: ["w-40", "w-32", "w-28", "w-44"],
    },
  ] as SkeletonColumn[]
)
  .map((column) => ({
    ...column,
    headClassName: LIST_HEAD,
    cellClassName: LIST_CELL,
  }))
  .concat({
    headClassName: `${LIST_HEAD} w-12`,
    cellClassName: LIST_CELL,
    shape: "menu",
  });

// The users table while its first page loads, drawn like UserTable.
export const UsersTableSkeleton = () => (
  <TableSkeleton
    columns={USER_COLUMNS}
    rows={10}
    className='border-gray-200'
    headRowClassName={LIST_HEAD_ROW}
    rowClassName={`h-[69px] ${LIST_ROW}`}
    phoneCards
  />
);

// The "Show all" user table while its first page loads.
const UserTabSkeleton = () => (
  <SkeletonRegion label='Loading users'>
    <UsersTableSkeleton />
  </SkeletonRegion>
);

export default UserTabSkeleton;

import React from "react";
import { SkeletonRegion, TableSkeleton, type SkeletonColumn } from "../parts";

// Same columns as UserTable.
export const USER_COLUMNS: SkeletonColumn[] = [
  { label: "Status", cellClassName: "pl-6", shape: "dot" },
  { label: "Name", bar: ["w-24", "w-28", "w-20", "w-32"] },
  { label: "Email", bar: ["w-36", "w-40", "w-32"] },
  { label: "Contact", bar: "w-20" },
  { label: "Role", shape: "pill", bar: ["w-24", "w-16", "w-24", "w-20"] },
  {
    label: "Offices / Sites",
    shape: "pill",
    bar: ["w-40", "w-32", "w-28", "w-44"],
  },
  { label: "Actions", headClassName: "text-right", shape: "menu" },
];

// The "Show all" user table while its first page loads.
const UserTabSkeleton = () => (
  <SkeletonRegion label='Loading users'>
    <TableSkeleton
      columns={USER_COLUMNS}
      rows={10}
      rowClassName='h-16'
    />
  </SkeletonRegion>
);

export default UserTabSkeleton;

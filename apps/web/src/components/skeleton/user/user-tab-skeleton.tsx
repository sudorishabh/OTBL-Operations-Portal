import React from "react";
import { skeletonsParentStyle } from "@/styles";
import TableRowSkeleton from "../table-row-skeleton";

const UserTabSkeleton = () => {
  return (
    <div className={skeletonsParentStyle}>

      <TableRowSkeleton />
      <TableRowSkeleton />
      <TableRowSkeleton />
      <TableRowSkeleton />
      <TableRowSkeleton />
      <TableRowSkeleton />
      <TableRowSkeleton />
    </div>
  );
};

export default UserTabSkeleton;

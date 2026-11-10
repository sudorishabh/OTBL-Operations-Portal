import React from "react";
import { SkeletonRegion, TableSkeleton, type SkeletonColumn } from "../parts";

// Same columns as the contacts tab's table.
const COLUMNS: SkeletonColumn[] = [
  {
    label: "Contact Person",
    headClassName: "pl-8",
    bar: ["w-28", "w-24", "w-32"],
  },
  { label: "Email", bar: ["w-40", "w-36", "w-44"] },
  { label: "Phone", bar: "w-20" },
  { label: "Designation", bar: ["w-24", "w-20", "w-28"] },
  { label: "Client", bar: ["w-36", "w-40", "w-32"] },
  { label: "Type", shape: "pill", bar: "w-14" },
  { label: "Actions", headClassName: "text-right", shape: "menu" },
];

const ClientContactsSkeleton = () => (
  <SkeletonRegion label='Loading contacts'>
    <TableSkeleton
      columns={COLUMNS}
      rows={10}
    />
  </SkeletonRegion>
);

export default ClientContactsSkeleton;

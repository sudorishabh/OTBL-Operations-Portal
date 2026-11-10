import React from "react";
import {
  FilterBarSkeleton,
  SkeletonRegion,
  TableSkeleton,
  type SkeletonColumn,
} from "../parts";

const DATE: SkeletonColumn = { bar: "w-12", sub: "w-10" };

// Same columns as WorkOrderTable.
const COLUMNS: SkeletonColumn[] = [
  { label: "Code", headClassName: "pl-8", cellClassName: "pl-8", bar: "w-28" },
  {
    label: "Title",
    bar: ["w-56", "w-64", "w-48", "w-60"],
    sub: ["w-40", "w-28", "w-44", "w-32"],
  },
  { label: "Client", bar: ["w-28", "w-24", "w-32"], sub: ["w-20", "w-24"] },
  { label: "Office", shape: "pill", bar: ["w-32", "w-28", "w-36"] },
  { label: "Start Date", ...DATE },
  { label: "End Date", ...DATE },
  { label: "Budget", bar: "w-12" },
  { label: "Status", shape: "pill" },
  { label: "Actions", headClassName: "text-right", shape: "menu" },
];

export const WorkOrdersTableSkeleton = () => (
  <SkeletonRegion label='Loading work orders'>
    <TableSkeleton
      columns={COLUMNS}
      rows={10}
    />
  </SkeletonRegion>
);

// The whole list, filters included, for before the page itself is ready.
const WorkOrdersSkeleton = () => (
  <SkeletonRegion
    label='Loading work orders'
    className='mt-8'>
    <FilterBarSkeleton
      selects={["w-[140px]", "w-[180px]"]}
      className='mb-4'
    />
    <TableSkeleton
      columns={COLUMNS}
      rows={10}
    />
  </SkeletonRegion>
);

export default WorkOrdersSkeleton;

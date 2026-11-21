import React from "react";
import {
  FilterBarSkeleton,
  SkeletonRegion,
  TableSkeleton,
  type SkeletonColumn,
} from "../parts";
import {
  LIST_CELL,
  LIST_HEAD,
  LIST_HEAD_ROW,
  LIST_ROW,
} from "@/components/shared/list-table";

// Same columns as WorkOrderTable.
const COLUMNS: SkeletonColumn[] = (
  [
    {
      label: "Work order",
      bar: ["w-28", "w-32", "w-24"],
      sub: ["w-24", "w-28", "w-20"],
    },
    {
      label: "Client",
      bar: ["w-32", "w-28", "w-36"],
      sub: ["w-24", "w-20", "w-28"],
    },
    { label: "Dates", bar: "w-20", sub: "w-20" },
    { label: "Budget", bar: "w-16", align: "right" },
    { label: "Status", shape: "pill" },
  ] as SkeletonColumn[]
)
  .map((column) => ({
    ...column,
    headClassName:
      column.align === "right" ? `${LIST_HEAD} text-right` : LIST_HEAD,
    cellClassName: LIST_CELL,
  }))
  .concat({
    headClassName: `${LIST_HEAD} w-12`,
    cellClassName: LIST_CELL,
    shape: "menu",
  });

const WorkOrdersTable = () => (
  <TableSkeleton
    columns={COLUMNS}
    rows={10}
    className='border-gray-200'
    headRowClassName={LIST_HEAD_ROW}
    rowClassName={`h-[69px] ${LIST_ROW}`}
    phoneCards
  />
);

export const WorkOrdersTableSkeleton = () => (
  <SkeletonRegion label='Loading work orders'>
    <WorkOrdersTable />
  </SkeletonRegion>
);

// The whole list, filters included, for before the page itself is ready.
const WorkOrdersSkeleton = () => (
  <SkeletonRegion
    label='Loading work orders'
    className='mt-8'>
    <FilterBarSkeleton
      search='sm:w-72'
      selects={["w-28", "w-28", "w-28", "w-32", "w-32"]}
      className='mb-4'
    />
    <WorkOrdersTable />
  </SkeletonRegion>
);

export default WorkOrdersSkeleton;

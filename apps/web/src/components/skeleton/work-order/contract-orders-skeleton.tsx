import React from "react";
import { SkeletonRegion, TableSkeleton, type SkeletonColumn } from "../parts";

// Classes the purchase orders and sub-contracts table uses.
const HEAD = "h-9 px-4 sm:h-9 sm:px-4 text-xs font-medium text-gray-500";
const CELL = "px-4 py-3 sm:px-4 sm:py-3";

const COLUMNS: SkeletonColumn[] = [
  { label: "Order", headClassName: "w-[16rem]", bar: "w-40", sub: "w-24" },
  { label: "Date", headClassName: "w-[7.5rem]", bar: "w-20" },
  { label: "Vendors", headClassName: "w-[12rem]", bar: ["w-32", "w-28"] },
  {
    label: "Requirements by site",
    bar: ["w-64", "w-56", "w-72"],
    sub: ["w-48", "w-40"],
  },
  { headClassName: "w-px", shape: "menu" },
].map((column) => ({
  ...column,
  headClassName: `${HEAD} ${column.headClassName ?? ""}`,
  cellClassName: CELL,
})) as SkeletonColumn[];

const ContractOrdersSkeleton = () => (
  <SkeletonRegion label='Loading orders'>
    <TableSkeleton
      columns={COLUMNS}
      rows={3}
      className='border-gray-200'
      headRowClassName='bg-gray-50'
    />
  </SkeletonRegion>
);

export default ContractOrdersSkeleton;

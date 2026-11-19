import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonRegion, TableSkeleton, type SkeletonColumn } from "../parts";

// Classes the purchase orders and sub-contracts table uses.
const HEAD = "h-9 px-3 sm:h-9 sm:px-3 text-xs font-medium text-gray-500";
const CELL = "px-3 py-3 sm:px-3 sm:py-3";
const FIRST = "pl-4 sm:pl-4";

const COLUMNS: SkeletonColumn[] = [
  {
    label: "Order",
    headClassName: `w-[12rem] ${FIRST}`,
    cellClassName: FIRST,
    bar: "w-20",
    sub: "w-24",
  },
  { label: "Vendors", headClassName: "w-[10rem]", bar: ["w-32", "w-28"] },
  { label: "Requirements by site", bar: ["w-64", "w-56", "w-72"] },
  {
    label: "Cost",
    headClassName: "w-[8.5rem] text-right",
    align: "right",
    bar: ["w-20", "w-16"],
    sub: "w-24",
  },
  {
    label: "Completion",
    headClassName: "w-[8rem]",
    shape: "pill",
    bar: "w-24",
  },
  { headClassName: "w-px", shape: "menu" },
].map((column) => ({
  ...column,
  headClassName: `${HEAD} ${column.headClassName ?? ""}`,
  cellClassName: `${CELL} ${column.cellClassName ?? ""}`,
})) as SkeletonColumn[];

// The filter row over the table, type tabs on the left and the search and
// filters on the right, then a few rows of orders.
const ContractOrdersSkeleton = () => (
  <SkeletonRegion label='Loading orders'>
    <div className='mb-3 flex flex-wrap items-center gap-2'>
      <Skeleton className='h-8 w-80 max-w-full' />
      <div className='flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto'>
        <Skeleton className='h-8 w-full sm:w-56' />
        <Skeleton className='h-8 w-24' />
        <Skeleton className='h-8 w-28' />
        <Skeleton className='h-8 w-28' />
        <Skeleton className='h-8 w-32' />
        <Skeleton className='h-8 w-32' />
      </div>
    </div>
    <TableSkeleton
      columns={COLUMNS}
      rows={3}
      className='border-gray-200'
      headRowClassName='bg-gray-50'
    />
  </SkeletonRegion>
);

export default ContractOrdersSkeleton;

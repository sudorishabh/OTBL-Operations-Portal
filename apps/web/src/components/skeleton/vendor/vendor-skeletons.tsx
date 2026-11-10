"use client";
import React from "react";
import { ClipboardList, ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsManager } from "@/contexts/AuthContext";
import {
  SkeletonCard,
  SkeletonRegion,
  TableSkeleton,
  TextLine,
  type SkeletonColumn,
} from "../parts";

// Classes the vendor list table uses.
const LIST_HEAD = "h-10 px-4 sm:h-10 sm:px-4 text-xs font-medium text-gray-500";
const LIST_CELL = "px-4 py-3 sm:px-4 sm:py-3";

const LIST_COLUMNS: SkeletonColumn[] = [
  {
    label: "Vendor",
    bar: ["w-36", "w-44", "w-32", "w-40"],
    sub: ["w-56", "w-48", "w-64"],
  },
  { label: "Contact", bar: "w-24", sub: ["w-48", "w-44", "w-52"] },
  { label: "GST / PAN", bar: "w-32", sub: "w-20" },
  { label: "Status", shape: "pill", bar: "w-14" },
].map((column) => ({
  ...column,
  headClassName: LIST_HEAD,
  cellClassName: LIST_CELL,
})) as SkeletonColumn[];

// The vendor list; managers get a column for the row menu.
export const VendorsTableSkeleton = ({
  withActions,
}: {
  withActions: boolean;
}) => (
  <SkeletonRegion label='Loading vendors'>
    <TableSkeleton
      columns={
        withActions
          ? [
              ...LIST_COLUMNS,
              {
                headClassName: `${LIST_HEAD} w-12`,
                cellClassName: LIST_CELL,
                shape: "menu",
              },
            ]
          : LIST_COLUMNS
      }
      rows={10}
      className='border-gray-200'
      headRowClassName='border-gray-200 bg-gray-50'
      rowClassName='h-[61px] border-gray-100'
    />
  </SkeletonRegion>
);

// Classes the vendor page's order tables use.
const WORK_HEAD = "h-9 px-4 text-xs font-medium text-gray-500";
const WORK_CELL = "px-4 py-2.5";

const ORDER_COLUMNS: SkeletonColumn[] = [
  { label: "Order", bar: "w-28" },
  { label: "Type", bar: "w-24" },
  { label: "Date", bar: "w-20" },
  { label: "Work order", bar: "w-32" },
  { label: "Spent", align: "right", bar: "w-24" },
];

const JOB_ORDER_COLUMNS: SkeletonColumn[] = [
  { label: "Job order", bar: ["w-96", "w-80", "w-[28rem]"] },
  { label: "Dates", bar: "w-36" },
  { label: "Work order", bar: "w-32" },
  { label: "Spent", align: "right", bar: "w-24" },
];

const withWorkClasses = (columns: SkeletonColumn[]) =>
  columns.map((column) => ({
    ...column,
    headClassName: `${WORK_HEAD}${column.align === "right" ? " text-right" : ""}`,
    cellClassName: WORK_CELL,
  }));

// One of the order tables on a vendor's page.
const WorkTableSkeleton = ({ kind }: { kind: "orders" | "job-orders" }) => (
  <TableSkeleton
    columns={withWorkClasses(
      kind === "orders" ? ORDER_COLUMNS : JOB_ORDER_COLUMNS,
    )}
    rows={3}
    className='border-gray-200'
    headRowClassName='bg-gray-50'
    rowClassName='h-[53px]'
  />
);

const SectionTitle = ({
  Icon,
  children,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <p className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
    <Icon className='size-4 text-gray-400' />
    {children}
  </p>
);

// A vendor's page: who they are, their figures, and both order tables.
export const VendorDetailSkeleton = () => (
  <SkeletonRegion
    label='Loading vendor'
    className='mt-4 space-y-6'>
    <SkeletonCard className='rounded-xl shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3 px-4 py-3'>
        <div className='flex min-w-0 flex-1 items-start gap-3'>
          <Skeleton className='size-9 shrink-0 rounded-lg' />
          <div className='min-w-0 flex-1'>
            <TextLine
              line='h-6'
              className='h-4 w-56'
            />
            <TextLine
              line='h-4'
              className='w-[28rem] max-w-full'
            />
          </div>
        </div>
        <Skeleton className='h-5 w-14 rounded-full' />
      </div>
      <div className='grid grid-cols-2 divide-x border-t bg-gray-50/60 sm:grid-cols-4'>
        {["w-10", "w-16", "w-14", "w-24"].map((label, index) => (
          <div
            key={index}
            className='px-4 py-3'>
            <TextLine
              line='h-4'
              className={label}
            />
            <TextLine
              line='mt-0.5 h-6'
              className='h-4 w-32'
            />
          </div>
        ))}
      </div>
    </SkeletonCard>

    <section className='space-y-2'>
      <SectionTitle Icon={ShoppingCart}>
        Purchase Orders &amp; Sub-contracts
      </SectionTitle>
      <WorkTableSkeleton kind='orders' />
    </section>

    <section className='space-y-2'>
      <SectionTitle Icon={ClipboardList}>Restoration Job Orders</SectionTitle>
      <WorkTableSkeleton kind='job-orders' />
    </section>
  </SkeletonRegion>
);

// The whole vendor list, search and status filter included, for before the
// page itself has mounted.
export const VendorListSkeleton = () => {
  const isManager = useIsManager();
  return (
    <div className='mt-4 space-y-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <Skeleton className='h-9 flex-1 bg-white/80' />
        <Skeleton className='h-9 w-full bg-white/80 sm:w-36' />
      </div>
      <VendorsTableSkeleton withActions={isManager} />
    </div>
  );
};

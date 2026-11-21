"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { SectionHeaderSkeleton, SkeletonRegion, TextLine } from "../parts";

// Same grid as ProposalWOList: proposal, arrow, work order.
const ROW_GRID = "md:grid-cols-[minmax(0,1fr)_1.75rem_minmax(0,1fr)]";

// A line of bars, each as wide as its class says.
const Bars = ({
  widths,
  className,
}: {
  widths: string[];
  className: string;
}) => (
  <div className='flex h-4 items-center gap-3'>
    {widths.map((width, index) => (
      <Skeleton
        key={index}
        className={cn(className, width)}
      />
    ))}
  </div>
);

// Mirrors ProposalCell: the code and status pill, the title, the meta line
// and the description, with the menu on the right for admins.
const ProposalSkeleton = ({
  title,
  menu,
}: {
  title: string;
  menu: boolean;
}) => (
  <div className='flex min-w-0 gap-3 px-3 py-2.5'>
    <div className='min-w-0 flex-1'>
      <div className='mb-1 flex h-5 items-center gap-2'>
        <Skeleton className='h-3 w-28' />
        <Skeleton className='h-4 w-16 rounded-full' />
      </div>
      <div className='flex h-5 items-center'>
        <Skeleton className={cn("h-3.5 max-w-full", title)} />
      </div>
      <div className='mt-1'>
        <Bars
          widths={["w-28", "w-8"]}
          className='h-3'
        />
      </div>
      <div className='mt-2'>
        {["w-full", "w-48"].map((width) => (
          <div
            key={width}
            className='flex h-5 items-center'>
            <Skeleton className={cn("h-3 max-w-full", width)} />
          </div>
        ))}
      </div>
    </div>
    {menu && (
      <Skeleton className='-mr-1 -mt-1 size-7 shrink-0 self-start rounded-md' />
    )}
  </div>
);

// Mirrors WorkOrderCell's card: the code and status pill, the meta line and
// the four labelled values, with a chevron on the right.
const WorkOrderSkeleton = ({ title }: { title: string }) => (
  <div className='flex h-full min-w-0 gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5'>
    <div className='min-w-0 flex-1'>
      <div className='flex h-5 items-center gap-2'>
        <Skeleton className={cn("h-3.5 max-w-full", title)} />
        <Skeleton className='h-4 w-16 shrink-0 rounded-full' />
      </div>
      <div className='mt-1'>
        <Bars
          widths={["w-24", "w-36", "w-8"]}
          className='h-3'
        />
      </div>
      <div className='mt-2 @container'>
        <div className='grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-200/80 pt-2 @xl:grid-cols-4'>
          {["w-24", "w-28", "w-24", "w-16"].map((width, index) => (
            <div key={index}>
              <div className='flex h-4 items-center'>
                <Skeleton className='h-2.5 w-16' />
              </div>
              <div className='flex h-5 items-center'>
                <Skeleton className={cn("h-3", width)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <Skeleton className='size-4 shrink-0 self-center' />
  </div>
);

const ROWS = [
  { proposal: "w-80", workOrder: "w-36" },
  { proposal: "w-96", workOrder: "w-40" },
  { proposal: "w-72", workOrder: "w-36" },
  { proposal: "w-80", workOrder: "w-32" },
];

// The proposals section: its header, the filters and a few proposal rows,
// each beside its work order.
const ClientProposalSkeleton = () => {
  const isAdmin = useIsAdmin();
  return (
    <SkeletonRegion label='Loading proposals'>
      <section className='rounded-lg border bg-white p-4 sm:p-6'>
        <SectionHeaderSkeleton
          title='Proposals and work orders'
          actions={isAdmin ? 1 : 0}
        />

        <div className='mb-3 flex flex-wrap items-center gap-2'>
          <Skeleton className='h-8 w-80 max-w-full' />
          <div className='ml-auto flex flex-wrap items-center gap-2'>
            <Skeleton className='h-8 w-full sm:w-52' />
            <Skeleton className='h-8 w-36' />
            <Skeleton className='h-8 w-40' />
            <Skeleton className='h-8 w-40' />
          </div>
        </div>

        <div className='overflow-hidden rounded-lg border border-gray-200'>
          <div
            className={cn(
              "hidden gap-3 border-b border-gray-200 bg-gray-50/60 px-3 py-2 text-xs font-medium text-gray-500 md:grid",
              ROW_GRID,
            )}>
            <span className='px-3'>Proposal</span>
            <span />
            <span className='px-3'>Work order</span>
          </div>
          <ul className='divide-y divide-gray-100'>
            {ROWS.map((row, index) => (
              <li
                key={index}
                className={cn("grid grid-cols-1 gap-2 p-3 md:gap-3", ROW_GRID)}>
                <ProposalSkeleton
                  title={row.proposal}
                  menu={isAdmin}
                />
                <Skeleton className='hidden size-7 self-center rounded-full md:block' />
                <WorkOrderSkeleton title={row.workOrder} />
              </li>
            ))}
          </ul>
          <div className='flex min-h-11 items-center border-t border-gray-200 bg-gray-50/60 px-5 py-2'>
            <TextLine
              line='h-4'
              className='w-24'
            />
          </div>
        </div>
      </section>
    </SkeletonRegion>
  );
};

export default ClientProposalSkeleton;

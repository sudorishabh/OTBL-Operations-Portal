"use client";
import React from "react";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { SectionHeaderSkeleton, SkeletonRegion, TextLine } from "../parts";

// Same grid as ProposalWOList: proposal, arrow, work order.
const ROW_GRID = "md:grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)]";

// Mirrors RowCell: a title line with its pill, a meta line, then more
// lines of details, and a chevron or a menu on the right.
const CellSkeleton = ({
  title,
  meta,
  lines,
  end,
}: {
  title: string;
  meta: string[];
  // Widths of the lines under the meta line, e.g. a description.
  lines: string[];
  end: "chevron" | "menu" | null;
}) => (
  <div className='flex min-w-0 items-center gap-3 px-3 py-2.5'>
    <div className='min-w-0 flex-1'>
      <div className='flex h-5 min-w-0 items-center gap-2'>
        <Skeleton className={cn("h-3.5 max-w-full", title)} />
        <Skeleton className='h-4 w-16 shrink-0 rounded-full' />
      </div>
      <div className='mt-1 flex h-4 items-center gap-3'>
        {meta.map((width, index) => (
          <Skeleton
            key={index}
            className={cn("h-3", width)}
          />
        ))}
      </div>
      {lines.map((width, index) => (
        <div
          key={index}
          className={cn("flex h-5 items-center", index === 0 && "mt-1")}>
          <Skeleton className={cn("h-3 max-w-full", width)} />
        </div>
      ))}
    </div>
    {end === "chevron" && <Skeleton className='size-4 shrink-0' />}
    {end === "menu" && (
      <Skeleton className='-mr-1 -mt-1 size-7 shrink-0 self-start rounded-md' />
    )}
  </div>
);

const ROWS = [
  { proposal: "w-80", workOrder: "w-72" },
  { proposal: "w-96", workOrder: "w-80" },
  { proposal: "w-72", workOrder: "w-64" },
  { proposal: "w-80", workOrder: "w-72" },
];

// The proposals section: its header, the filters and a few proposal rows,
// each beside its work order.
const ClientProposalSkeleton = () => {
  const isAdmin = useIsAdmin();
  return (
    <SkeletonRegion label='Loading proposals'>
      <section className='rounded-lg border bg-white p-6'>
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
              "hidden gap-2 border-b border-gray-200 bg-gray-50/60 px-2 py-2 text-xs font-medium text-gray-500 md:grid",
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
                className={cn(
                  "grid grid-cols-1 items-center gap-1 p-2 md:gap-2",
                  ROW_GRID,
                )}>
                <CellSkeleton
                  title={row.proposal}
                  meta={["w-28", "w-28", "w-8"]}
                  lines={["w-full", "w-48"]}
                  end={isAdmin ? "menu" : null}
                />
                <ArrowRight className='hidden size-4 justify-self-center text-gray-200 md:block' />
                <CellSkeleton
                  title={row.workOrder}
                  meta={["w-28", "w-24", "w-36", "w-8"]}
                  lines={["w-80"]}
                  end='chevron'
                />
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

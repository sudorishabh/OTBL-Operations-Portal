import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Pieces the loading skeletons are built from. Each one copies the spacing of
// the component it stands in for, so nothing moves when the data arrives.

// Bars on the grey page background need a darker grey than bars on a card.
export const ON_PAGE = "bg-gray-300/60";

// Tells screen readers the region is loading and hides the shapes from them.
export const SkeletonRegion = ({
  label = "Loading",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    role='status'
    aria-busy='true'>
    <span className='sr-only'>{label}</span>
    <div
      aria-hidden='true'
      className={className}>
      {children}
    </div>
  </div>
);

// A bar for inside a line of text or a badge, where a div isn't allowed.
export const InlineSkeleton = ({ className }: { className?: string }) => (
  <span
    aria-hidden='true'
    className={cn(
      "inline-block h-3 w-6 animate-pulse rounded bg-gray-200 align-middle motion-reduce:animate-none",
      className,
    )}
  />
);

// A bar centred in a box as tall as the line of text it replaces.
export const TextLine = ({
  line = "h-5",
  className,
}: {
  line?: string;
  className?: string;
}) => (
  <div className={cn("flex items-center", line)}>
    <Skeleton className={cn("h-3 w-full", className)} />
  </div>
);

export const SkeletonCard = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => (
  <div
    className={cn(
      "overflow-hidden rounded-lg border border-gray-200 bg-white",
      className,
    )}>
    {children}
  </div>
);

// The title row PageWrapper draws, for pages whose title waits on data.
// Text that never changes is shown as is.
export const PageHeaderSkeleton = ({
  back = false,
  title,
  description,
  action = false,
}: {
  back?: boolean;
  title?: string;
  description?: string;
  action?: boolean;
}) => (
  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
    <div className='flex min-w-0 flex-1 items-center gap-3 sm:gap-4'>
      {back && <Skeleton className='size-8 shrink-0 rounded-full bg-white/80' />}
      <div className='min-w-0 flex-1'>
        {title ? (
          <p className='truncate text-lg font-bold text-cyan-800 sm:text-xl'>
            {title}
          </p>
        ) : (
          <TextLine
            line='h-7'
            className={cn("h-5 w-96 max-w-[75%]", ON_PAGE)}
          />
        )}
        {description ? (
          <p className='line-clamp-2 text-xs font-medium text-gray-500 sm:text-sm'>
            {description}
          </p>
        ) : (
          <TextLine
            line='h-4 sm:h-5'
            className={cn("w-72 max-w-[60%]", ON_PAGE)}
          />
        )}
      </div>
    </div>
    {action && <Skeleton className={cn("h-8 w-32 shrink-0", ON_PAGE)} />}
  </div>
);

// White boxes where the search field and filter selects sit.
export const FilterBarSkeleton = ({
  search = "sm:max-w-md sm:flex-1",
  selects = ["w-[140px]"],
  className,
}: {
  search?: string;
  selects?: string[];
  className?: string;
}) => (
  <div
    className={cn(
      "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4",
      className,
    )}>
    <Skeleton className={cn("h-8 w-full bg-white/80", search)} />
    <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
      {selects.map((width, index) => (
        <Skeleton
          key={index}
          className={cn("h-8 bg-white/80", width)}
        />
      ))}
    </div>
  </div>
);

// Mirrors ProcessSectionHeader: icon tile, title and description, actions.
export const SectionHeaderSkeleton = ({
  title,
  actions = 0,
  className,
}: {
  title?: string;
  actions?: number;
  className?: string;
}) => (
  <div
    className={cn(
      "mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
      className,
    )}>
    <div className='flex min-w-0 items-center gap-3'>
      <Skeleton className='size-8 shrink-0 rounded-lg' />
      <div className='min-w-0'>
        {title ? (
          <p className='text-base font-semibold text-gray-900'>{title}</p>
        ) : (
          <TextLine
            line='h-6'
            className='h-4 w-44'
          />
        )}
        <TextLine
          line='h-4'
          className='w-64 max-w-full'
        />
      </div>
    </div>
    {actions > 0 && (
      <div className='flex flex-wrap items-center gap-2'>
        {Array.from({ length: actions }, (_, index) => (
          <Skeleton
            key={index}
            className='h-8 w-32'
          />
        ))}
      </div>
    )}
  </div>
);

// Mirrors the work order and client details cards (detail-card-parts):
// identity row, a strip of metric tiles, then a grid of label/value fields.
export const DetailCardSkeleton = ({
  pills = 1,
  buttons = 1,
  pillsOwnRow = false,
  metrics,
  metricsClassName,
  fields,
  fieldsClassName,
  notes = false,
}: {
  pills?: number;
  // Small outlined buttons after the pills, like "3 contacts".
  buttons?: number;
  // Long titles push the pills onto a row of their own.
  pillsOwnRow?: boolean;
  metrics: number;
  metricsClassName?: string;
  // One entry per field, holding classes for its cell such as col-span-2.
  fields: string[];
  fieldsClassName?: string;
  notes?: boolean;
}) => (
  <SkeletonCard>
    <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5'>
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <Skeleton className='size-8 shrink-0 rounded-lg' />
        <div className='min-w-0 flex-1'>
          <TextLine
            line='h-6'
            className='h-4 w-96 max-w-full'
          />
          <div className='mt-0.5 flex h-4 items-center gap-3'>
            <Skeleton className='h-3 w-24' />
            <Skeleton className='h-3 w-36' />
            <Skeleton className='h-3 w-20' />
          </div>
        </div>
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5",
          pillsOwnRow && "basis-full",
        )}>
        {Array.from({ length: pills }, (_, index) => (
          <Skeleton
            key={index}
            className='h-5 w-16 rounded-full'
          />
        ))}
        {Array.from({ length: buttons }, (_, index) => (
          <Skeleton
            key={index}
            className='h-7 w-24'
          />
        ))}
      </div>
    </div>

    <div
      className={cn(
        "grid grid-cols-2 divide-x divide-y divide-gray-200 border-y border-gray-200 bg-gray-50/60",
        metricsClassName,
      )}>
      {Array.from({ length: metrics }, (_, index) => (
        <div
          key={index}
          className='min-w-0 px-6 py-3'>
          <TextLine
            line='h-4'
            className='w-16'
          />
          <TextLine
            line='mt-0.5 h-[17.5px]'
            className='h-3.5 w-24'
          />
          <TextLine
            line='h-4'
            className='h-2.5 w-20'
          />
        </div>
      ))}
    </div>

    <div
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4",
        fieldsClassName,
      )}>
      {fields.map((fieldClassName, index) => (
        <div
          key={index}
          className={cn("min-w-0", fieldClassName)}>
          <TextLine
            line='h-4'
            className='w-16'
          />
          <TextLine
            line='mt-0.5 h-5'
            className='h-3.5 w-4/5'
          />
        </div>
      ))}
    </div>

    {notes && (
      <div className='border-t border-gray-100 px-6 py-2.5'>
        <TextLine
          line='h-[19.5px]'
          className='w-1/2'
        />
      </div>
    )}
  </SkeletonCard>
);

export type SkeletonColumn = {
  // Column headings never change, so the real heading is shown.
  label?: React.ReactNode;
  headClassName?: string;
  cellClassName?: string;
  shape?: "text" | "pill" | "dot" | "menu";
  // Width of the bar; give a list to vary it from row to row.
  bar?: string | string[];
  // Width of a smaller second line under the bar.
  sub?: string | string[];
  align?: "right";
};

const pick = (value: string | string[] | undefined, row: number) =>
  Array.isArray(value) ? value[row % value.length] : value;

const CellSkeleton = ({
  column,
  row,
}: {
  column: SkeletonColumn;
  row: number;
}) => {
  const right = column.align === "right";
  switch (column.shape) {
    case "pill":
      return (
        <Skeleton
          className={cn(
            "h-5 rounded-full",
            pick(column.bar, row) ?? "w-16",
            right && "ml-auto",
          )}
        />
      );
    case "dot":
      return (
        <Skeleton className={cn("size-3 rounded-full", right && "ml-auto")} />
      );
    case "menu":
      // Where the ghost "..." button sits.
      return (
        <div className='ml-auto flex size-8 items-center justify-center'>
          <Skeleton className='h-1.5 w-4 rounded-full' />
        </div>
      );
    default:
      return (
        <div className={cn("flex flex-col gap-1.5", right && "items-end")}>
          <Skeleton
            className={cn("h-3.5 max-w-full", pick(column.bar, row) ?? "w-24")}
          />
          {column.sub && (
            <Skeleton
              className={cn("h-3 max-w-full", pick(column.sub, row))}
            />
          )}
        </div>
      );
  }
};

// A table with its real headings and placeholder rows, in the same
// Table parts the loaded table uses.
export const TableSkeleton = ({
  columns,
  rows = 8,
  className,
  headRowClassName,
  rowClassName,
}: {
  columns: SkeletonColumn[];
  rows?: number;
  className?: string;
  headRowClassName?: string;
  rowClassName?: string;
}) => (
  <div className={cn("overflow-hidden rounded-lg border bg-white", className)}>
    <Table>
      <TableHeader>
        <TableRow className={cn("hover:bg-transparent", headRowClassName)}>
          {columns.map((column, index) => (
            <TableHead
              key={index}
              className={cn("text-xs", column.headClassName)}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }, (_, row) => (
          <TableRow
            key={row}
            className={cn("hover:bg-transparent", rowClassName)}>
            {columns.map((column, index) => (
              <TableCell
                key={index}
                className={column.cellClassName}>
                <CellSkeleton
                  column={column}
                  row={row}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

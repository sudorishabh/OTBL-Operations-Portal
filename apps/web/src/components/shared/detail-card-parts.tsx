import React from "react";
import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";

// Building blocks shared by the work order and client details cards.

// Pill colours for a work order's status and process.
export const STATUS_STYLES: Record<
  "pending" | "completed" | "cancelled",
  string
> = {
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
};

export const PROCESS_STYLES: Record<string, string> = {
  [constants.WO_PROCESS.BIOREMEDIATION]:
    "bg-blue-50 text-blue-700 ring-blue-200",
  [constants.WO_PROCESS.RESTORATION]:
    "bg-purple-50 text-purple-700 ring-purple-200",
  [constants.WO_PROCESS.BIOREMEDIATION_RESTORATION]:
    "bg-orange-50 text-orange-700 ring-orange-200",
};

// A small outlined pill for statuses and types.
export const Pill = ({
  className,
  title,
  children,
}: {
  className: string;
  title?: string;
  children: React.ReactNode;
}) => (
  <span
    title={title}
    className={cn(
      "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
      className,
    )}>
    {children}
  </span>
);

export const Empty = () => <span className='text-gray-300'>&mdash;</span>;

// Dense label/value pair used across a detail grid.
export const Field = ({
  label,
  value,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("min-w-0", className)}>
    <div className='text-xs text-gray-500'>{label}</div>
    <div
      className='mt-0.5 truncate text-[13px] font-medium text-gray-800'
      title={typeof value === "string" ? value : undefined}>
      {value || <Empty />}
    </div>
  </div>
);

// Metric tile: headline figure with a qualifier underneath.
export const Metric = ({
  label,
  value,
  hint,
  valueClass = "text-gray-900",
  hintClass = "text-gray-400",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  valueClass?: string;
  hintClass?: string;
}) => (
  <div className='min-w-0 px-6 py-3'>
    <div className='text-xs text-gray-500'>{label}</div>
    <div
      className={cn(
        "mt-0.5 truncate text-sm font-semibold tabular-nums leading-tight",
        valueClass,
      )}>
      {value}
    </div>
    {/* Fixed height keeps tiles aligned when a metric has no qualifier. */}
    <div className={cn("h-4 truncate text-[11px] leading-4", hintClass)}>
      {hint}
    </div>
  </div>
);

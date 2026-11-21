import React, { type ComponentType } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// One headline figure: what it is, the figure, and a line of context under
// it. With a link, the whole tile leads to where the figure comes from.
export const StatTile = ({
  icon: Icon,
  iconClassName = "bg-cyan-50 text-cyan-700 ring-cyan-100",
  label,
  value,
  hint,
  loading = false,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  // The icon's chip colours, so tiles can be told apart at a glance.
  iconClassName?: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  loading?: boolean;
  href?: string;
}) => {
  const body = (
    <>
      <div className='flex items-center gap-2'>
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
            iconClassName,
          )}>
          <Icon className='size-3.5' />
        </span>
        <span className='truncate text-[12px] font-medium text-gray-500'>
          {label}
        </span>
      </div>
      {loading ? (
        <div
          role='status'
          aria-busy='true'
          className='mt-2 space-y-1.5'>
          <span className='sr-only'>Loading {label.toLowerCase()}</span>
          <Skeleton
            aria-hidden='true'
            className='h-6 w-24'
          />
          <Skeleton
            aria-hidden='true'
            className='h-3 w-32'
          />
        </div>
      ) : (
        <>
          <p className='mt-1.5 truncate text-[22px] font-semibold leading-tight text-gray-900'>
            {value}
          </p>
          {hint && (
            <p className='mt-0.5 text-[12px] leading-snug text-gray-500'>
              {hint}
            </p>
          )}
        </>
      )}
    </>
  );

  const frame =
    "block h-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm";

  return href ? (
    <Link
      href={href}
      className={cn(
        frame,
        "transition-colors hover:border-cyan-900/20 hover:bg-cyan-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40",
      )}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
};

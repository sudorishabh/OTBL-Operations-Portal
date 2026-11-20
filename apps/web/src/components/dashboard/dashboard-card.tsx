import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ExpandButton } from "./section-dialog";

// The white card each part of the overview sits in: a title, an optional
// line under it and a link on the right, then its content.
export const DashboardCard = ({
  title,
  description,
  action,
  onExpand,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  // Opens the section large in its dialog.
  onExpand?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <section
    aria-label={title}
    className={cn(
      "flex min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm",
      className,
    )}>
    <header className='flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-2.5'>
      <div className='min-w-0'>
        <h2 className='text-[14px] font-semibold leading-tight tracking-tight text-gray-900'>
          {title}
        </h2>
        {description && (
          <p className='mt-0.5 text-[12px] leading-tight text-gray-500'>
            {description}
          </p>
        )}
      </div>
      {(action || onExpand) && (
        <div className='flex shrink-0 items-center gap-2'>
          {action}
          {onExpand && (
            <ExpandButton
              title={title}
              onClick={onExpand}
            />
          )}
        </div>
      )}
    </header>
    <div className='flex flex-1 flex-col'>{children}</div>
  </section>
);

// "View all" and the like, at the top right of a card.
export const CardLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className='inline-flex items-center gap-1 text-[12px] font-medium text-cyan-700 transition-colors hover:text-cyan-800'>
    {children}
    <ArrowRight className='size-3' />
  </Link>
);

// What a card says instead of its content: nothing to show yet, or the
// figures failed to load.
export const CardMessage = ({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "error";
  children: React.ReactNode;
}) => (
  <p
    role={tone === "error" ? "alert" : undefined}
    className={cn(
      "flex flex-1 items-center justify-center px-4 py-8 text-center text-[13px]",
      tone === "error" ? "text-rose-600" : "text-gray-500",
    )}>
    {children}
  </p>
);

export const CARD_ERROR =
  "Could not load these figures. Refresh and try again.";

// Grey rows standing in for a card's content while it loads.
export const CardSkeleton = ({
  rows = 4,
  label,
}: {
  rows?: number;
  label: string;
}) => (
  <div
    role='status'
    aria-busy='true'
    className='flex flex-1 flex-col gap-3 px-4 py-4'>
    <span className='sr-only'>{label}</span>
    {Array.from({ length: rows }, (_, index) => (
      <div
        key={index}
        aria-hidden='true'
        className='space-y-1.5'>
        <Skeleton className='h-3 w-1/3' />
        <Skeleton className='h-2 w-full' />
      </div>
    ))}
  </div>
);

import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import { cn } from "@/lib/utils";

// One look for the portal's record lists, such as work orders, users and
// vendors: a white card with a grey header band, small grey column names and
// rows set apart by faint lines.
export const LIST_FRAME =
  "overflow-hidden rounded-lg border border-gray-200 bg-white";
export const LIST_HEAD_ROW = "border-gray-200 bg-gray-50 hover:bg-gray-50";
export const LIST_HEAD =
  "h-10 px-4 sm:h-10 sm:px-4 text-xs font-medium text-gray-500";
export const LIST_ROW = "border-gray-100";
export const LIST_CELL = "px-4 py-3 sm:px-4 sm:py-3 text-sm text-gray-700";

// A record's name or code leading to its page.
export const LIST_LINK = "hover:text-emerald-700 hover:underline";
// A second, quieter line under a cell's value.
export const LIST_SUBTEXT = "text-xs text-gray-400";

// The "Load more" strip under a list with more pages.
export const ListLoadMore = ({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) => (
  <div className='border-t py-2.5'>
    <LoadMoreBtn
      onClick={onClick}
      loading={loading}
      className='pt-0'
    />
  </div>
);

// The ⋯ button opening a row's menu; `label` names it for screen readers.
export const RowActionsButton = ({
  label,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) => (
  <Button
    variant='ghost'
    className={cn("h-8 w-8 p-0", className)}
    {...props}>
    <span className='sr-only'>{label}</span>
    <MoreHorizontal className='h-4 w-4' />
  </Button>
);

const PILL_TONES = {
  gray: "border-gray-200 bg-gray-100 text-gray-700",
  green: "border-green-200 bg-green-100 text-green-800",
  yellow: "border-yellow-200 bg-yellow-100 text-yellow-800",
  red: "border-red-200 bg-red-100 text-red-800",
  cyan: "border-cyan-200 bg-cyan-100 text-cyan-900",
  sky: "border-sky-200 bg-sky-100 text-sky-800",
  orange: "border-orange-200 bg-orange-100 text-orange-900",
} as const;

export type PillTone = keyof typeof PILL_TONES;

// A soft, rounded label for a status or role. `square` suits tags, such as
// the offices and sites a user works at.
export const ListPill = ({
  tone = "gray",
  square = false,
  className,
  children,
}: {
  tone?: PillTone;
  square?: boolean;
  className?: string;
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      "inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[11px] font-medium leading-4",
      square ? "rounded" : "rounded-full",
      PILL_TONES[tone],
      className,
    )}>
    {children}
  </span>
);

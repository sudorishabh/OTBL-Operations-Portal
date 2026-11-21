import React, { type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { formatCount, formatShare } from "./format";

export type Segment = {
  key: string;
  label: string;
  value: number;
  // The block's fill, and the ink its share is printed in on that fill.
  fillClassName: string;
  textClassName: string;
  // Marks the part in the legend, so its colour never carries it alone.
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
};

// Below this share a block is too narrow for its share to fit inside it.
const LABEL_MIN_SHARE = 0.12;

// One whole split into a few parts: a block per part, as wide as its share,
// with the share printed inside where it fits; then a legend naming each
// part with its count. Parts at zero draw no block.
export const SegmentedBar = ({
  segments,
  title,
}: {
  segments: Segment[];
  // Names the whole, for screen readers.
  title: string;
}) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const shown = segments.filter((segment) => segment.value > 0);
  const summary = segments
    .map(
      (segment) =>
        `${segment.label} ${formatCount(segment.value)} (${formatShare(segment.value, total)})`,
    )
    .join(", ");

  return (
    <div>
      <div
        role='img'
        aria-label={`${title}: ${summary}`}
        className='flex h-7 w-full gap-0.5'>
        {total === 0 ? (
          <div className='h-full w-full rounded-[4px] bg-gray-100' />
        ) : (
          shown.map((segment) => {
            const share = segment.value / total;
            return (
              <div
                key={segment.key}
                title={`${segment.label}: ${formatCount(segment.value)} (${formatShare(segment.value, total)})`}
                className={cn(
                  "flex h-full min-w-1 items-center rounded-[4px] px-2 text-[11px] font-semibold",
                  segment.fillClassName,
                  segment.textClassName,
                )}
                style={{ flexGrow: segment.value, flexBasis: 0 }}>
                {share >= LABEL_MIN_SHARE && formatShare(segment.value, total)}
              </div>
            );
          })
        )}
      </div>

      <ul className='mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5'>
        {segments.map((segment) => (
          <li
            key={segment.key}
            className='flex items-center gap-1.5 text-[12px] text-gray-600'>
            <segment.icon
              aria-hidden='true'
              className={cn("size-3.5 shrink-0", segment.iconClassName)}
            />
            {segment.label}
            <span className='font-semibold tabular-nums text-gray-900'>
              {formatCount(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

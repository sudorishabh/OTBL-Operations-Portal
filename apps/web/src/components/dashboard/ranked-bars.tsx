import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type RankedBar = {
  key: string;
  label: string;
  // A quieter note after the name, such as a code or a count.
  note?: string;
  value: number;
  href?: string;
};

// Parts compared with each other, largest first: a name and figure on each
// row and a bar under them, every bar in one hue and measured against the
// largest, so their lengths compare on one baseline.
export const RankedBars = ({
  rows,
  formatValue,
  title,
}: {
  rows: RankedBar[];
  formatValue: (value: number) => string;
  // Names the list for screen readers.
  title: string;
}) => {
  const largest = Math.max(...rows.map((row) => row.value), 0);

  return (
    <ul
      aria-label={title}
      className='space-y-2.5'>
      {rows.map((row) => {
        const share = largest > 0 ? row.value / largest : 0;
        const name = row.href ? (
          <Link
            href={row.href}
            className='truncate font-medium text-gray-700 hover:text-emerald-700 hover:underline'>
            {row.label}
          </Link>
        ) : (
          <span className='truncate font-medium text-gray-700'>
            {row.label}
          </span>
        );

        return (
          <li
            key={row.key}
            className='min-w-0'>
            <div className='flex items-baseline justify-between gap-3 text-[12px]'>
              <span className='flex min-w-0 items-baseline gap-1.5'>
                {name}
                {row.note && (
                  <span className='shrink-0 text-[11px] text-gray-400'>
                    {row.note}
                  </span>
                )}
              </span>
              <span className='shrink-0 font-semibold tabular-nums text-gray-900'>
                {formatValue(row.value)}
              </span>
            </div>
            {/* Square at the baseline, rounded at the data end. */}
            <div
              aria-hidden='true'
              className='mt-1 h-2'>
              <div
                className={cn(
                  "h-full rounded-r-[4px] bg-cyan-600",
                  row.value > 0 && "min-w-0.5",
                )}
                style={{ width: `${share * 100}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

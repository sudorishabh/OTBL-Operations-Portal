import React from "react";
import { formatCount, formatShare } from "./format";

// How much of a whole is done, as a named row: the figures on the right and
// a bar under them, its track a lighter step of the same hue.
export const MeterRow = ({
  label,
  value,
  total,
  detail,
}: {
  label: string;
  value: number;
  total: number;
  // A note after the figures, such as what the rest are.
  detail?: string;
}) => {
  const share = total > 0 ? Math.min(value / total, 1) : 0;

  return (
    <div className='min-w-0'>
      <div className='flex items-baseline justify-between gap-3 text-[12px]'>
        <span className='truncate font-medium text-gray-700'>{label}</span>
        <span className='shrink-0 tabular-nums text-gray-500'>
          <span className='font-semibold text-gray-900'>
            {formatCount(value)}
          </span>
          {" / "}
          {formatCount(total)}
          <span className='ml-1.5 text-gray-400'>
            {formatShare(value, total)}
          </span>
        </span>
      </div>
      <div
        role='meter'
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
        aria-valuetext={`${formatCount(value)} of ${formatCount(total)}`}
        className='mt-1 h-2 overflow-hidden rounded-full bg-cyan-100'>
        <div
          className='h-full rounded-full bg-cyan-600'
          style={{ width: `${share * 100}%` }}
        />
      </div>
      {detail && <p className='mt-1 text-[11px] text-gray-400'>{detail}</p>}
    </div>
  );
};

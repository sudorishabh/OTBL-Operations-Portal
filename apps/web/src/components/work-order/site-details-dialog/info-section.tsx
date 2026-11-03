import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  // What the part is for, under its title.
  description?: React.ReactNode;
  // Its buttons: beside the title on small screens, under it on wide ones.
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// One part of an information card as a row: its name, what it is for and its
// buttons in a shaded column on the left, its content on the right, so every
// part's content starts on the same line. On small screens the shaded column
// becomes a strip above the content.
const InfoSection = ({
  title,
  description,
  actions,
  children,
  className,
}: Props) => (
  <div
    className={cn(
      "grid grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)]",
      className,
    )}>
    <div className='flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-5 py-3 lg:flex-col lg:justify-start lg:border-b-0 lg:border-r lg:py-4'>
      <div className='min-w-0'>
        <h4 className='text-[13px] font-semibold text-gray-800'>{title}</h4>
        {description && (
          <p className='mt-0.5 text-xs leading-relaxed text-gray-500'>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className='flex shrink-0 flex-wrap items-center gap-2'>
          {actions}
        </div>
      )}
    </div>
    {/* A container, so what it holds lays out by the room it has. */}
    <div className='@container min-w-0 px-5 py-4'>{children}</div>
  </div>
);

export default InfoSection;

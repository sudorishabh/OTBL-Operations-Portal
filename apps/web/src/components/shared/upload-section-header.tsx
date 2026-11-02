import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  Icon: React.ElementType;
  title: string;
  // What the document is, beside the title.
  description?: string;
  className?: string;
}

// A document upload's title on one line, with what the document is beside it
// for as far as it fits.
const UploadSectionHeader = ({ Icon, title, description, className }: Props) => (
  <div className={cn("flex min-w-0 items-center gap-2", className)}>
    <Icon className='size-3.5 shrink-0 text-gray-400' />
    <h4 className='shrink-0 text-xs font-medium text-gray-700'>{title}</h4>
    {description && (
      <p
        className='min-w-0 truncate text-[11px] text-gray-400'
        title={description}>
        {description}
      </p>
    )}
  </div>
);

export default UploadSectionHeader;

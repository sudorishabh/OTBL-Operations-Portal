import React from "react";
import { cn } from "@/lib/utils";

// Each process keeps the colour of its badge on the work order details card.
export const PROCESS_TONES = {
  bioremediation: {
    icon: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  restoration: {
    icon: "bg-purple-50 text-purple-700 ring-purple-100",
  },
} as const;

// Sections that aren't a process share the details card's icon colour.
const DEFAULT_TONE = "bg-emerald-50 text-emerald-700 ring-emerald-100";

interface Props {
  Icon: React.ElementType;
  tone?: keyof typeof PROCESS_TONES;
  title: string;
  description: string;
  // Actions shown on the right.
  children?: React.ReactNode;
}

const ProcessSectionHeader = ({
  Icon,
  tone,
  title,
  description,
  children,
}: Props) => (
  <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
    <div className='flex items-center gap-3'>
      <div
        className={cn(
          "rounded-lg p-2 ring-1",
          tone ? PROCESS_TONES[tone].icon : DEFAULT_TONE,
        )}>
        <Icon className='size-4' />
      </div>
      <div>
        <h2 className='text-base font-semibold text-gray-900'>{title}</h2>
        <p className='text-xs text-gray-500'>{description}</p>
      </div>
    </div>
    {children && (
      <div className='flex flex-wrap items-center gap-2'>{children}</div>
    )}
  </div>
);

export default ProcessSectionHeader;

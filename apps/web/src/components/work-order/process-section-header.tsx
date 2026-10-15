import React from "react";
import { cn } from "@/lib/utils";

// Each process keeps the colour of its badge on the work order details card.
export const PROCESS_TONES = {
  bioremediation: {
    section: "border-l-blue-500",
    icon: "bg-blue-50 text-blue-700 ring-blue-100",
  },
  restoration: {
    section: "border-l-purple-500",
    icon: "bg-purple-50 text-purple-700 ring-purple-100",
  },
} as const;

interface Props {
  Icon: React.ElementType;
  tone: keyof typeof PROCESS_TONES;
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
      <div className={cn("rounded-lg p-2 ring-1", PROCESS_TONES[tone].icon)}>
        <Icon className='size-4' />
      </div>
      <div>
        <h2 className='text-md font-semibold text-gray-900'>{title}</h2>
        <p className='text-xs text-gray-500'>{description}</p>
      </div>
    </div>
    {children && (
      <div className='flex flex-wrap items-center gap-2'>{children}</div>
    )}
  </div>
);

export default ProcessSectionHeader;

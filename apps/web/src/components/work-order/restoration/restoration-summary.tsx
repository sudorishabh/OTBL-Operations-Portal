import React from "react";
import { FolderOpen } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { cn } from "@/lib/utils";
import CustomButton from "@/components/shared/btn";
import {
  formatDateRange,
  statusOf,
  STATUS_STYLES,
} from "@/lib/wo-site-display";
import type { Restoration } from "./restoration-section";

interface Props {
  workOrder: { start_date: string | Date; end_date: string | Date };
  restoration: Restoration;
  operatorUploadsCount: number;
  onOpenOperatorUploads: () => void;
}

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className='flex min-w-0 items-center gap-2'>
    <span className='shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
      {label}
    </span>
    <span className='min-w-0 text-[13px] font-medium text-gray-800'>
      {children}
    </span>
  </div>
);

// What the restoration carries over from its work order, at a glance.
const RestorationSummary = ({
  workOrder,
  restoration,
  operatorUploadsCount,
  onOpenOperatorUploads,
}: Props) => {
  const status = statusOf(
    restoration.is_completed ? "completed" : restoration.status,
  );

  return (
    <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-2'>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-1.5'>
        <Field label='Status'>
          <span
            className={cn(
              "inline-flex rounded-full px-2 text-[12px] leading-5 font-semibold",
              STATUS_STYLES[status],
            )}>
            {capitalFirstLetter(status)}
          </span>
        </Field>
        <Field label='Work order schedule'>
          {formatDateRange(workOrder.start_date, workOrder.end_date)}
        </Field>
        <Field label='Vendors'>
          {restoration.contractors.length > 0 ? (
            restoration.contractors
              .map((contractor) => capitalFirstLetter(contractor.name))
              .join(", ")
          ) : (
            <span className='text-gray-400'>None yet</span>
          )}
        </Field>
      </div>
      {operatorUploadsCount > 0 && (
        <CustomButton
          variant='outline'
          Icon={FolderOpen}
          text={`Operator Uploads (${operatorUploadsCount})`}
          onClick={onOpenOperatorUploads}
          className='h-7 text-xs'
        />
      )}
    </div>
  );
};

export default RestorationSummary;

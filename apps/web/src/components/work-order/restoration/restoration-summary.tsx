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
  <div className='min-w-0'>
    <div className='text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400'>
      {label}
    </div>
    <div className='mt-0.5 text-[13px] font-medium text-gray-800'>
      {children}
    </div>
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
    <div className='flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3'>
        <Field label='Status'>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold",
              STATUS_STYLES[status],
            )}>
            {capitalFirstLetter(status)}
          </span>
        </Field>
        <Field label='Work order schedule'>
          {formatDateRange(workOrder.start_date, workOrder.end_date)}
        </Field>
        <Field label='Contractors'>
          {restoration.contractors.length > 0 ? (
            restoration.contractors
              .map((contractor) => capitalFirstLetter(contractor.name))
              .join(", ")
          ) : (
            <span className='text-gray-400'>Not assigned yet</span>
          )}
        </Field>
      </div>
      {operatorUploadsCount > 0 && (
        <CustomButton
          variant='outline'
          Icon={FolderOpen}
          text={`Operator Uploads (${operatorUploadsCount})`}
          onClick={onOpenOperatorUploads}
        />
      )}
    </div>
  );
};

export default RestorationSummary;

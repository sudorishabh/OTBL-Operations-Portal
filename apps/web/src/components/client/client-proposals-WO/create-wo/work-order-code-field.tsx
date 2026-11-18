"use client";
import React from "react";
import { Hash } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  // A saved work order's code. Without one, the code a new work order would
  // get is worked out from its start date.
  code?: string;
}

const toValidDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? null : date;
};

// The work order's code, which is numbered by the server rather than typed:
// the financial year it starts in, its serial in that year, then its serial
// overall, such as 2025-26(10)OTBL163.
const WorkOrderCodeField = ({ code }: Props) => {
  const { control } = useFormContext();
  const startDate = toValidDate(useWatch({ control, name: "start_date" }));

  const nextCode = trpc.workOrderQuery.getNextWorkOrderCode.useQuery(
    { start_date: startDate },
    { enabled: !code && !!startDate },
  );

  const value = code ?? nextCode.data?.code;
  const hint = code
    ? "Fixed once the work order is created"
    : startDate
      ? "Numbered when the work order is saved"
      : "Pick the start date to see the code";

  return (
    <div className='space-y-1'>
      <p className='text-xs font-medium text-neutral-700'>Work Order Code</p>
      <div className='flex h-9 items-center gap-2 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3'>
        <Hash className='size-3.5 shrink-0 text-gray-400' />
        {!code && nextCode.isFetching ? (
          <Skeleton className='h-3.5 w-36' />
        ) : (
          <span className='truncate font-mono text-sm text-gray-800'>
            {value ?? "—"}
          </span>
        )}
      </div>
      <p className='text-xs text-neutral-500'>{hint}</p>
    </div>
  );
};

export default WorkOrderCodeField;

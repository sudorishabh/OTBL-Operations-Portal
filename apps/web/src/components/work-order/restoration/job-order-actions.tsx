"use client";
import React, { useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileDown,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useIsViewer } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import JobOrderCompletionDialog from "./job-order-completion-dialog";
import type { JobOrder, JobOrderWorkOrder } from "./job-order-dialog";
import type { RestorationRate } from "./restoration-rates-table";
import useJobOrderFormDownload from "./use-job-order-form-download";

interface Props {
  restorationId: number;
  jobOrder: JobOrder;
  workOrder: JobOrderWorkOrder;
  // The work order's restoration schedule of rates.
  rates: RestorationRate[];
  onEdit: () => void;
}

// A job order's menu: its forms, then edit and delete. Anyone can download
// its forms. A job order with expenses can't be deleted; the server says so.
const JobOrderActions = ({
  restorationId,
  jobOrder,
  workOrder,
  rates,
  onEdit,
}: Props) => {
  const isViewer = useIsViewer();
  const { download, isDownloading } = useJobOrderFormDownload(workOrder);
  const [completionOpen, setCompletionOpen] = useState(false);
  const hasCompletion = jobOrder.completion_activities != null;
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const deleteJobOrder = trpc.jobOrderMutation.deleteJobOrder.useMutation({
    onSuccess: async () => {
      toast.success("Job order deleted");
      // Its certificate no longer uses up the schedule of rates.
      await Promise.all([
        utils.jobOrderQuery.getJobOrders.invalidate({
          work_order_site_id: restorationId,
        }),
        utils.restorationQuery.getRestoration.invalidate(),
        utils.workOrderQuery.getWorkOrderDetails.invalidate(),
      ]);
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            aria-label={`Job order ${jobOrder.jo_number} actions`}
            className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-700'>
            <MoreHorizontal className='size-4' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          className='w-60'>
          <DropdownMenuItem
            disabled={isDownloading}
            onSelect={() => download(jobOrder)}>
            <FileDown className='size-4 text-gray-500' />
            {isDownloading ? "Downloading..." : "Download job order form"}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setCompletionOpen(true)}>
            <ClipboardCheck className='size-4 text-gray-500' />
            Work completion certificate
            {hasCompletion && (
              <CheckCircle2
                aria-label='Work done saved'
                className='ml-auto size-3.5 text-emerald-600'
              />
            )}
          </DropdownMenuItem>
          {!isViewer && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className='size-4 text-gray-500' />
                Edit job order
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={deleteJobOrder.isPending}
                onSelect={() => {
                  if (confirm(`Delete job order ${jobOrder.jo_number}?`)) {
                    deleteJobOrder.mutate({ id: jobOrder.id });
                  }
                }}
                variant='destructive'>
                <Trash2 className='size-4' />
                Delete job order
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <JobOrderCompletionDialog
        restorationId={restorationId}
        jobOrder={jobOrder}
        workOrder={workOrder}
        rates={rates}
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
      />
    </>
  );
};

export default JobOrderActions;

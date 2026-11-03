"use client";
import React, { useState } from "react";
import {
  ClipboardCheck,
  FileDown,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useIsViewer } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import JobOrderCompletionDialog from "./job-order-completion-dialog";
import type { JobOrder, JobOrderWorkOrder } from "./job-order-dialog";
import useJobOrderFormDownload from "./use-job-order-form-download";

interface Props {
  restorationId: number;
  jobOrder: JobOrder;
  workOrder: JobOrderWorkOrder;
  onEdit: () => void;
  // Extra buttons before edit and delete.
  children?: React.ReactNode;
}

const iconButton =
  "rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40";

// Download, completion, edit and delete buttons on a job order's row. Anyone
// can download its forms. A job order with expenses can't be deleted; the
// server says so.
const JobOrderActions = ({
  restorationId,
  jobOrder,
  workOrder,
  onEdit,
  children,
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
      await utils.jobOrderQuery.getJobOrders.invalidate({
        work_order_site_id: restorationId,
      });
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  });

  return (
    <div className='flex shrink-0 items-center gap-0.5'>
      {children}
      <button
        type='button'
        title='Download job order form'
        disabled={isDownloading}
        onClick={() => download(jobOrder)}
        className={iconButton}>
        {isDownloading ? (
          <Loader2 className='size-3.5 animate-spin' />
        ) : (
          <FileDown className='size-3.5' />
        )}
      </button>
      <button
        type='button'
        title={
          hasCompletion
            ? "Work completion certificate (work done saved)"
            : "Work completion certificate"
        }
        onClick={() => setCompletionOpen(true)}
        className={cn(iconButton, hasCompletion && "text-emerald-600")}>
        <ClipboardCheck className='size-3.5' />
      </button>
      {!isViewer && (
        <>
          <button
            type='button'
            title='Edit job order'
            onClick={onEdit}
            className={iconButton}>
            <Pencil className='size-3.5' />
          </button>
          <button
            type='button'
            title='Delete job order'
            disabled={deleteJobOrder.isPending}
            onClick={() => {
              if (confirm(`Delete job order ${jobOrder.jo_number}?`)) {
                deleteJobOrder.mutate({ id: jobOrder.id });
              }
            }}
            className={`${iconButton} hover:bg-red-50 hover:text-red-500`}>
            <Trash2 className='size-3.5' />
          </button>
        </>
      )}

      <JobOrderCompletionDialog
        restorationId={restorationId}
        jobOrder={jobOrder}
        workOrder={workOrder}
        open={completionOpen}
        onClose={() => setCompletionOpen(false)}
      />
    </div>
  );
};

export default JobOrderActions;

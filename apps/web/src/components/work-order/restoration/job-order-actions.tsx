"use client";
import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useIsViewer } from "@/contexts/AuthContext";
import type { JobOrder } from "./job-order-dialog";

interface Props {
  restorationId: number;
  jobOrder: JobOrder;
  onEdit: () => void;
  // Extra buttons before edit and delete.
  children?: React.ReactNode;
}

const iconButton =
  "rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40";

// Edit and delete buttons on a job order's row. A job order with expenses
// can't be deleted; the server says so.
const JobOrderActions = ({ restorationId, jobOrder, onEdit, children }: Props) => {
  const isViewer = useIsViewer();
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
    </div>
  );
};

export default JobOrderActions;

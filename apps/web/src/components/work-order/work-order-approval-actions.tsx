"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import CustomButton from "@/components/shared/btn";
import DialogWindow from "@/components/shared/dialog-window";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  workOrderId: number;
  status: "pending" | "completed" | "cancelled";
  isApproved: boolean;
  canManage: boolean;
}

const WorkOrderApprovalActions = ({
  workOrderId,
  status,
  isApproved,
  canManage,
}: Props) => {
  const utils = trpc.useUtils();
  const { handleError } = useApiError();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const invalidate = () =>
    utils.workOrderQuery.getWorkOrderDetails.invalidate({ id: workOrderId });

  const approve = trpc.workOrderMutation.approveWorkOrder.useMutation({
    onSuccess: async () => {
      toast.success("Work order approved");
      await invalidate();
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  const cancel = trpc.workOrderMutation.cancelWorkOrder.useMutation({
    onSuccess: async () => {
      toast.success("Work order cancelled");
      setCancelOpen(false);
      setReason("");
      await invalidate();
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  if (!canManage || status === "cancelled") return null;

  const busy = approve.isPending || cancel.isPending;

  return (
    <>
      <div className='flex items-center gap-2'>
        {!isApproved && (
          <CustomButton
            type='button'
            text='Approve'
            variant='primary'
            Icon={CheckCircle2}
            loading={approve.isPending}
            disabled={busy}
            onClick={() => approve.mutate({ id: workOrderId })}
          />
        )}
        <CustomButton
          type='button'
          text='Cancel WO'
          variant='outline'
          Icon={XCircle}
          disabled={busy}
          onClick={() => setCancelOpen(true)}
        />
      </div>

      <DialogWindow
        open={cancelOpen}
        setOpen={(next) => {
          if (!next) {
            setCancelOpen(false);
            setReason("");
          }
        }}
        title='Cancel work order'
        description='This marks the work order as cancelled. A reason is required and will be recorded.'
        size='sm'
        heightMode='auto'>
        <div className='space-y-4'>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Reason for cancellation...'
            rows={4}
            maxLength={1000}
          />
          <div className='flex justify-end gap-2'>
            <CustomButton
              type='button'
              text='Keep work order'
              variant='secondary'
              disabled={cancel.isPending}
              onClick={() => {
                setCancelOpen(false);
                setReason("");
              }}
            />
            <CustomButton
              type='button'
              text='Confirm cancellation'
              variant='primary'
              loading={cancel.isPending}
              disabled={cancel.isPending || reason.trim().length === 0}
              onClick={() =>
                cancel.mutate({
                  id: workOrderId,
                  cancellation_reason: reason.trim(),
                })
              }
            />
          </div>
        </div>
      </DialogWindow>
    </>
  );
};

export default WorkOrderApprovalActions;

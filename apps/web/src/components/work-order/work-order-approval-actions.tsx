"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import CustomButton from "@/components/shared/btn";

interface Props {
  workOrderId: number;
  isApproved: boolean;
  canManage: boolean;
}

const WorkOrderApprovalActions = ({
  workOrderId,
  isApproved,
  canManage,
}: Props) => {
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const approve = trpc.workOrderMutation.approveWorkOrder.useMutation({
    onSuccess: async () => {
      toast.success("Work order approved");
      await utils.workOrderQuery.getWorkOrderDetails.invalidate({
        id: workOrderId,
      });
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  if (!canManage || isApproved) return null;

  return (
    <CustomButton
      type='button'
      text='Approve'
      variant='primary'
      Icon={CheckCircle2}
      loading={approve.isPending}
      disabled={approve.isPending}
      onClick={() => approve.mutate({ id: workOrderId })}
    />
  );
};

export default WorkOrderApprovalActions;

"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import { type PickerItem } from "@/components/shared/paged-picker";
import VendorPicker from "@/components/vendor/vendor-picker";

// The job order whose vendors are being chosen, and those it has.
export type VendorsJobOrder = {
  id: number;
  jo_number: string;
  vendors: { id: number; name: string }[];
};

interface Props {
  // The work order's restoration row.
  restorationId: number;
  jobOrder: VendorsJobOrder | null;
  open: boolean;
  onClose: () => void;
}

// Chooses who a job order is given to, once the job order exists, from the
// vendors a page at a time. A vendor with expenses on it can't be taken off;
// the server says so.
const JobOrderVendorsDialog = ({
  restorationId,
  jobOrder,
  open,
  onClose,
}: Props) => {
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [vendors, setVendors] = useState<PickerItem[]>([]);

  // Filled in as the dialog opens, so a refetch doesn't undo the choice.
  useEffect(() => {
    if (!open) return;
    setVendors(
      jobOrder?.vendors.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
      })) ?? [],
    );
  }, [open, jobOrder]);

  const saveVendors = trpc.jobOrderMutation.setJobOrderVendors.useMutation({
    onSuccess: async () => {
      toast.success("Vendors saved");
      await Promise.all([
        utils.jobOrderQuery.getJobOrders.invalidate({
          work_order_site_id: restorationId,
        }),
        utils.restorationQuery.getRestoration.invalidate(),
        utils.contractorQuery.getContractorWork.invalidate(),
      ]);
      onClose();
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  });
  const isSaving = saveVendors.isPending;

  return (
    <DialogWindow
      title='Job Order Vendors'
      description={
        jobOrder ? `Who job order ${jobOrder.jo_number} is given to` : undefined
      }
      size='md'
      open={open}
      setOpen={(next) => {
        if (!next && !isSaving) onClose();
      }}>
      <div className='space-y-3 py-2'>
        {open && (
          <VendorPicker
            mode='multiple'
            selected={vendors}
            onChange={setVendors}
          />
        )}

        <p className='text-xs text-gray-500'>
          <span className='font-semibold tabular-nums text-gray-900'>
            {vendors.length}
          </span>{" "}
          chosen. A vendor with expenses on this job order can&apos;t be taken
          off it.
        </p>

        <div className='flex justify-end gap-2 pt-1'>
          <CustomButton
            type='button'
            variant='outline'
            text='Cancel'
            onClick={onClose}
            disabled={isSaving}
          />
          <CustomButton
            type='button'
            variant='primary'
            text='Save vendors'
            loading={isSaving}
            disabled={!jobOrder || isSaving}
            onClick={() =>
              jobOrder &&
              saveVendors.mutate({
                id: jobOrder.id,
                contractor_ids: vendors.map((vendor) => vendor.id),
              })
            }
          />
        </div>
      </div>
    </DialogWindow>
  );
};

export default JobOrderVendorsDialog;

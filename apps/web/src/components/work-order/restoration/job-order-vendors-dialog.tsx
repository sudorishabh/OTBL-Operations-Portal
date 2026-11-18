"use client";
import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import RecordCode from "@/components/shared/record-code";
import NewVendorButton from "@/components/vendor/new-vendor-button";

// The job order whose vendors are being chosen, and those it has.
export type VendorsJobOrder = {
  id: number;
  jo_number: string;
  vendors: { id: number }[];
};

type Vendor = { id: number; code: string; name: string };

interface Props {
  // The work order's restoration row.
  restorationId: number;
  jobOrder: VendorsJobOrder | null;
  open: boolean;
  onClose: () => void;
}

// Chooses who a job order is given to, once the job order exists. A vendor
// with expenses on it can't be taken off; the server says so.
const JobOrderVendorsDialog = ({
  restorationId,
  jobOrder,
  open,
  onClose,
}: Props) => {
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [vendorIds, setVendorIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  // Filled in as the dialog opens, so a refetch doesn't undo the choice.
  useEffect(() => {
    if (!open) return;
    setVendorIds(jobOrder?.vendors.map((vendor) => vendor.id) ?? []);
    setSearch("");
  }, [open, jobOrder]);

  const vendorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: open },
  );
  const vendors = (vendorsQuery.data?.contractors ?? []) as Vendor[];
  const term = search.trim().toLowerCase();
  const shown = term
    ? vendors.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(term) ||
          vendor.code.toLowerCase().includes(term),
      )
    : vendors;

  const toggle = (id: number, checked: boolean) =>
    setVendorIds((prev) =>
      checked ? [...prev, id] : prev.filter((vendorId) => vendorId !== id),
    );
  const chooseNewVendor = (id: number) =>
    setVendorIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

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
      }}
      isLoading={vendorsQuery.isLoading}
      loadingSkeleton='list'>
      <div className='space-y-3 py-2'>
        <div className='flex items-center gap-3'>
          <div className='relative flex-1'>
            <Search className='pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400' />
            <Input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Find by code or name'
              aria-label='Find a vendor'
              className='h-9 pl-8'
            />
          </div>
          <NewVendorButton onAdded={(vendor) => chooseNewVendor(vendor.id)} />
        </div>

        <div className='max-h-72 overflow-y-auto rounded-lg border bg-white p-1.5'>
          {shown.length === 0 ? (
            <p className='px-2 py-3 text-xs text-gray-400'>
              {vendors.length === 0
                ? "No vendors yet. Add one with New vendor."
                : "No vendor matches that."}
            </p>
          ) : (
            shown.map((vendor) => (
              <label
                key={vendor.id}
                className='flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50'>
                <Checkbox
                  checked={vendorIds.includes(vendor.id)}
                  onCheckedChange={(checked) =>
                    toggle(vendor.id, checked === true)
                  }
                />
                <RecordCode code={vendor.code} />
                <span className='truncate'>{vendor.name}</span>
              </label>
            ))
          )}
        </div>

        <p className='text-xs text-gray-500'>
          <span className='font-semibold tabular-nums text-gray-900'>
            {vendorIds.length}
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
                contractor_ids: vendorIds,
              })
            }
          />
        </div>
      </div>
    </DialogWindow>
  );
};

export default JobOrderVendorsDialog;

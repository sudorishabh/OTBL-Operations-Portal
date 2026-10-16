"use client";
import React, { useEffect, useState } from "react";
import { HardHat, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useIsManager } from "@/contexts/AuthContext";
import CustomButton from "@/components/shared/btn";
import DialogWindow from "@/components/shared/dialog-window";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VendorFormDialog from "@/components/vendor/vendor-form-dialog";

type Vendor = { id: number; name: string; status: string };

interface Props {
  woSiteId: number;
  // The vendors the site already has.
  contractors: { id: number }[];
}

// Adds a vendor to a restoration or bioremediation site so expenses can be
// recorded under it: an existing vendor, or a new one created on the spot.
// Managers only.
const AddSiteVendor = ({ woSiteId, contractors }: Props) => {
  const isManager = useIsManager();
  const utils = trpc.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (isOpen) setSelectedId("");
  }, [isOpen]);

  const vendorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: isOpen },
  );
  const addedIds = new Set(contractors.map((c) => c.id));
  const vendors = ((vendorsQuery.data?.contractors ?? []) as Vendor[]).filter(
    (vendor) => vendor.status === "active" && !addedIds.has(vendor.id),
  );

  const addMutation =
    trpc.siteContractorMutation.addSiteContractor.useMutation({
      onSuccess: () => {
        toast.success("Vendor added");
        setIsOpen(false);
        utils.siteContractorQuery.getSiteContractors.invalidate({
          work_order_site_id: woSiteId,
        });
        utils.restorationQuery.getRestoration.invalidate();
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });

  const add = (vendorId: number) =>
    addMutation.mutate({
      work_order_site_id: woSiteId,
      contractor_id: vendorId,
    });

  if (!isManager) return null;

  return (
    <>
      <CustomButton
        variant='outline'
        Icon={HardHat}
        text='Add vendor'
        onClick={() => setIsOpen(true)}
        className='h-8 text-xs'
        disableForViewer
      />

      <DialogWindow
        open={isOpen && !isCreating}
        setOpen={setIsOpen}
        title='Add vendor'
        description='Expenses can then be recorded under this vendor.'
        size='sm'
        heightMode='auto'>
        <div className='space-y-4 py-2'>
          <Select
            value={selectedId}
            onValueChange={setSelectedId}>
            <SelectTrigger className='h-9 w-full text-sm'>
              <SelectValue
                placeholder={
                  vendorsQuery.isLoading
                    ? "Loading vendors..."
                    : "Select a vendor"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {!vendorsQuery.isLoading && vendors.length === 0 && (
                <div className='px-3 py-2 text-xs text-gray-500'>
                  No other active vendors. Create a new one below.
                </div>
              )}
              {vendors.map((vendor) => (
                <SelectItem
                  key={vendor.id}
                  value={String(vendor.id)}
                  className='text-sm'>
                  {capitalFirstLetter(vendor.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className='flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
            <button
              type='button'
              onClick={() => setIsCreating(true)}
              className='inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline'>
              <Plus className='size-3.5' />
              Create a new vendor
            </button>
            <div className='flex justify-end gap-2'>
              <CustomButton
                variant='secondary'
                text='Cancel'
                onClick={() => setIsOpen(false)}
              />
              <CustomButton
                variant='primary'
                text='Add vendor'
                loading={addMutation.isPending}
                disabled={!selectedId || addMutation.isPending}
                onClick={() => add(Number(selectedId))}
              />
            </div>
          </div>
        </div>
      </DialogWindow>

      {/* A vendor created here is added to the site right away. */}
      <VendorFormDialog
        open={isCreating}
        onOpenChange={(open) => {
          if (!open) setIsCreating(false);
        }}
        onSaved={(vendorId) => {
          setIsOpen(false);
          add(vendorId);
        }}
      />
    </>
  );
};

export default AddSiteVendor;

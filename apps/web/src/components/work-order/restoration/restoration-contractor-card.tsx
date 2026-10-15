"use client";
import React, { useState } from "react";
import { HardHat, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useIsManager } from "@/contexts/AuthContext";
import CustomButton from "@/components/shared/btn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VendorFormDialog from "@/components/vendor/vendor-form-dialog";
import type { Restoration } from "./restoration-section";

type Vendor = { id: number; name: string; status: string };

interface Props {
  restoration: Restoration;
  workOrderId: number;
}

// The vendor the restoration is ordered to; the office manager assigns it.
const RestorationContractorCard = ({ restoration, workOrderId }: Props) => {
  const isManager = useIsManager();
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const contractor = restoration.contractor;

  const vendorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: isEditing },
  );
  const vendors = ((vendorsQuery.data?.contractors ?? []) as Vendor[]).filter(
    (vendor) => vendor.status === "active",
  );

  const saveMutation =
    trpc.restorationMutation.setRestorationContractor.useMutation({
      onSuccess: () => {
        toast.success("Contractor saved");
        setIsEditing(false);
        utils.restorationQuery.getRestoration.invalidate({
          work_order_id: workOrderId,
        });
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });

  const save = (contractorId: number | null) =>
    saveMutation.mutate({
      work_order_site_id: restoration.id,
      contractor_id: contractorId,
    });

  const contactLine = contractor
    ? [
        contractor.contact_number,
        contractor.gst_number && `GST ${contractor.gst_number}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className='rounded-xl border border-gray-200 bg-gray-50/60 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex min-w-0 items-start gap-3'>
          <div className='rounded-lg bg-purple-50 p-2 text-purple-700 ring-1 ring-purple-100'>
            <HardHat className='size-4' />
          </div>
          <div className='min-w-0'>
            <p className='text-xs font-semibold text-gray-500'>Contractor</p>
            {contractor ? (
              <>
                <p className='truncate text-sm font-semibold text-gray-900'>
                  {capitalFirstLetter(contractor.name)}
                </p>
                <p className='text-xs text-gray-500'>
                  {contactLine || "No contact details"}
                </p>
              </>
            ) : (
              <p className='text-sm text-gray-600'>
                No contractor yet. Assign the vendor this restoration is ordered
                to.
              </p>
            )}
          </div>
        </div>
        {isManager && !isEditing && (
          <div className='flex shrink-0 gap-2'>
            <CustomButton
              variant='outline'
              Icon={Plus}
              text='New vendor'
              onClick={() => setIsAddingVendor(true)}
              disableForViewer
            />
            <CustomButton
              variant='outline'
              text={contractor ? "Change contractor" : "Assign contractor"}
              onClick={() => {
                setSelectedId(contractor ? String(contractor.id) : "");
                setIsEditing(true);
              }}
              disableForViewer
            />
          </div>
        )}
      </div>

      {isEditing && (
        <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center'>
          <Select
            value={selectedId}
            onValueChange={setSelectedId}>
            <SelectTrigger className='h-9 flex-1 bg-white text-sm'>
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
                  No active vendors yet. Use New vendor to add one.
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
          <div className='flex gap-2'>
            <CustomButton
              variant='outline'
              Icon={Plus}
              text='New vendor'
              onClick={() => setIsAddingVendor(true)}
              disableForViewer
            />
            <CustomButton
              variant='primary'
              text='Save'
              loading={saveMutation.isPending}
              disabled={!selectedId || saveMutation.isPending}
              onClick={() => save(Number(selectedId))}
            />
            {contractor && (
              <CustomButton
                variant='outline'
                text='Remove'
                disabled={saveMutation.isPending}
                onClick={() => save(null)}
              />
            )}
            <CustomButton
              variant='outline'
              text='Cancel'
              onClick={() => setIsEditing(false)}
            />
          </div>
        </div>
      )}

      {/* A vendor added here becomes the contractor right away. */}
      <VendorFormDialog
        open={isAddingVendor}
        onOpenChange={setIsAddingVendor}
        onSaved={(vendorId) => save(vendorId)}
      />
    </div>
  );
};

export default RestorationContractorCard;

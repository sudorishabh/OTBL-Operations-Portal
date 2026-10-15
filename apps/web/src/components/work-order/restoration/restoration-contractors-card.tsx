"use client";
import React, { useState } from "react";
import { HardHat, Plus, X } from "lucide-react";
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
type Contractor = Restoration["contractors"][number];

interface Props {
  restoration: Restoration;
  workOrderId: number;
}

const contactLine = (contractor: Contractor) =>
  [
    contractor.contact_number,
    contractor.gst_number && `GST ${contractor.gst_number}`,
  ]
    .filter(Boolean)
    .join(", ");

// The vendors the restoration is ordered to; the office manager adds and
// removes them.
const RestorationContractorsCard = ({ restoration, workOrderId }: Props) => {
  const isManager = useIsManager();
  const utils = trpc.useUtils();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const { contractors } = restoration;

  const vendorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: isAdding },
  );
  const assignedIds = new Set(contractors.map((c) => c.id));
  const vendors = ((vendorsQuery.data?.contractors ?? []) as Vendor[]).filter(
    (vendor) => vendor.status === "active" && !assignedIds.has(vendor.id),
  );

  const refresh = () =>
    utils.restorationQuery.getRestoration.invalidate({
      work_order_id: workOrderId,
    });

  const addMutation =
    trpc.restorationMutation.addRestorationContractor.useMutation({
      onSuccess: () => {
        toast.success("Contractor added");
        setIsAdding(false);
        setSelectedId("");
        refresh();
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });

  const removeMutation =
    trpc.restorationMutation.removeRestorationContractor.useMutation({
      onSuccess: () => {
        toast.success("Contractor removed");
        refresh();
      },
      onError: (error: { message: string }) => toast.error(error.message),
      onSettled: () => setRemovingId(null),
    });

  const add = (contractorId: number) =>
    addMutation.mutate({
      work_order_site_id: restoration.id,
      contractor_id: contractorId,
    });

  const remove = (contractorId: number) => {
    setRemovingId(contractorId);
    removeMutation.mutate({
      work_order_site_id: restoration.id,
      contractor_id: contractorId,
    });
  };

  return (
    <div className='rounded-xl border border-gray-200 bg-gray-50/60 p-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <div className='rounded-lg bg-purple-50 p-2 text-purple-700 ring-1 ring-purple-100'>
            <HardHat className='size-4' />
          </div>
          <p className='text-xs font-semibold text-gray-500'>
            Contractors
            {contractors.length > 0 && ` (${contractors.length})`}
          </p>
        </div>
        {isManager && !isAdding && (
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
              text='Add contractor'
              onClick={() => {
                setSelectedId("");
                setIsAdding(true);
              }}
              disableForViewer
            />
          </div>
        )}
      </div>

      {contractors.length === 0 ? (
        <p className='mt-3 text-sm text-gray-600'>
          No contractors yet. Add the vendors this restoration is ordered to.
        </p>
      ) : (
        <ul className='mt-3 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white'>
          {contractors.map((contractor) => (
            <li
              key={contractor.id}
              className='flex items-center justify-between gap-3 px-3 py-2'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold text-gray-900'>
                  {capitalFirstLetter(contractor.name)}
                  {contractor.status !== "active" && (
                    <span className='ml-2 text-xs font-medium text-gray-400'>
                      Inactive
                    </span>
                  )}
                </p>
                <p className='truncate text-xs text-gray-500'>
                  {contactLine(contractor) || "No contact details"}
                </p>
              </div>
              {isManager && (
                <CustomButton
                  variant='outline'
                  Icon={X}
                  text='Remove'
                  title={`Remove ${capitalFirstLetter(contractor.name)}`}
                  loading={removingId === contractor.id}
                  disabled={removingId !== null}
                  onClick={() => remove(contractor.id)}
                  disableForViewer
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdding && (
        <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:items-center'>
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
                  No other active vendors. Use New vendor to add one.
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
              text='Add'
              loading={addMutation.isPending}
              disabled={!selectedId || addMutation.isPending}
              onClick={() => add(Number(selectedId))}
            />
            <CustomButton
              variant='outline'
              text='Cancel'
              onClick={() => setIsAdding(false)}
            />
          </div>
        </div>
      )}

      {/* A vendor added here becomes a contractor right away. */}
      <VendorFormDialog
        open={isAddingVendor}
        onOpenChange={setIsAddingVendor}
        onSaved={(vendorId) => add(vendorId)}
      />
    </div>
  );
};

export default RestorationContractorsCard;

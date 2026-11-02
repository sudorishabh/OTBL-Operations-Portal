"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { jobOrderSchemas } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// A restoration job order as getJobOrders returns it.
export interface JobOrder {
  id: number;
  jo_number: string;
  title: string;
  start_date: string | Date;
  end_date: string | Date;
  description: string | null;
  documents: unknown;
  vendors: { id: number; name: string }[];
}

interface Props {
  // The work order's restoration row.
  restorationId: number;
  open: boolean;
  onClose: () => void;
  // The job order being edited; a new one when left out.
  editing?: JobOrder | null;
}

const fieldLabel = "mb-1 block text-xs font-medium text-gray-700";
const toDateInput = (value: string | Date) => format(new Date(value), "yyyy-MM-dd");

// Creates or edits a restoration job order and the vendors it is given to.
const JobOrderDialog = ({ restorationId, open, onClose, editing }: Props) => {
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const [joNumber, setJoNumber] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [vendorIds, setVendorIds] = useState<number[]>([]);

  const vendorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: open },
  );
  // Inactive vendors can't take new job orders, but an edit keeps its own.
  const vendors = (vendorsQuery.data?.contractors ?? []).filter(
    (vendor: any) => vendor.status === "active" || vendorIds.includes(vendor.id),
  );

  useEffect(() => {
    if (!open) return;
    setJoNumber(editing?.jo_number ?? "");
    setTitle(editing?.title ?? "");
    setStartDate(toDateInput(editing?.start_date ?? new Date()));
    setEndDate(toDateInput(editing?.end_date ?? new Date()));
    setDescription(editing?.description ?? "");
    setVendorIds(editing?.vendors.map((vendor) => vendor.id) ?? []);
  }, [open, editing]);

  const onSaved = async (message: string) => {
    toast.success(message);
    onClose();
    await utils.jobOrderQuery.getJobOrders.invalidate({
      work_order_site_id: restorationId,
    });
  };
  const onError = (error: unknown) => handleError(error, { showToast: true });

  const createJobOrder = trpc.jobOrderMutation.createJobOrder.useMutation({
    onSuccess: () => onSaved("Job order added"),
    onError,
  });
  const updateJobOrder = trpc.jobOrderMutation.updateJobOrder.useMutation({
    onSuccess: () => onSaved("Job order updated"),
    onError,
  });

  const save = () => {
    const parsed = jobOrderSchemas.baseJobOrderSchema.safeParse({
      jo_number: joNumber,
      title,
      start_date: startDate ? new Date(startDate) : undefined,
      end_date: endDate ? new Date(endDate) : undefined,
      description,
      contractor_ids: vendorIds,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the job order");
      return;
    }

    if (editing) {
      updateJobOrder.mutate({ ...parsed.data, id: editing.id });
    } else {
      createJobOrder.mutate({
        ...parsed.data,
        work_order_site_id: restorationId,
      });
    }
  };

  const isSaving = createJobOrder.isPending || updateJobOrder.isPending;

  return (
    <DialogWindow
      title={editing ? "Edit Job Order" : "New Job Order"}
      description='Give restoration work to one or more vendors'
      size='lg'
      heightMode='auto'
      open={open}
      setOpen={(next) => {
        if (!next && !isSaving) onClose();
      }}>
      <div className='space-y-4 py-2'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-[10rem_1fr]'>
          <div>
            <label className={fieldLabel}>JO number</label>
            <Input
              value={joNumber}
              onChange={(e) => setJoNumber(e.target.value)}
              placeholder='e.g. JO-2'
              className='h-9'
            />
          </div>
          <div>
            <label className={fieldLabel}>Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='What the job order covers'
              className='h-9'
            />
          </div>
        </div>

        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <div>
            <label className={fieldLabel}>Start date</label>
            <Input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className='h-9'
            />
          </div>
          <div>
            <label className={fieldLabel}>End date</label>
            <Input
              type='date'
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className='h-9'
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Vendors</label>
          <div className='max-h-44 overflow-y-auto rounded-lg border bg-white p-2'>
            {vendors.length === 0 ? (
              <p className='px-1 py-2 text-xs text-gray-400'>
                {vendorsQuery.isLoading
                  ? "Loading vendors..."
                  : "No vendors yet. Add them on the Vendors page."}
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
                {vendors.map((vendor: any) => (
                  <label
                    key={vendor.id}
                    className='flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50'>
                    <Checkbox
                      checked={vendorIds.includes(vendor.id)}
                      onCheckedChange={(checked) =>
                        setVendorIds((prev) =>
                          checked === true
                            ? [...prev, vendor.id]
                            : prev.filter((id) => id !== vendor.id),
                        )
                      }
                    />
                    {vendor.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional'
            rows={2}
          />
        </div>

        <div className='flex justify-end gap-2'>
          <CustomButton
            type='button'
            variant='outline'
            text='Cancel'
            disabled={isSaving}
            onClick={onClose}
          />
          <CustomButton
            type='button'
            variant='primary'
            text={editing ? "Save job order" : "Add job order"}
            loading={isSaving}
            disabled={isSaving}
            onClick={save}
          />
        </div>
      </div>
    </DialogWindow>
  );
};

export default JobOrderDialog;

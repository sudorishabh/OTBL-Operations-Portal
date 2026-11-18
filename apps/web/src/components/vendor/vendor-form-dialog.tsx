"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { z } from "zod";
import { vendorSchemas } from "@pkg/schema";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import CustomInput from "@/components/shared/input";
import { Form } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { VENDOR_DESCRIPTION } from "./vendor-labels";

const vendorFormSchema = vendorSchemas.createVendorSchema;
type VendorFormInput = z.input<typeof vendorFormSchema>;
type VendorFormValues = z.output<typeof vendorFormSchema>;

const EMPTY_FORM: VendorFormInput = {
  name: "",
  contact_number: "",
  email: "",
  address: "",
  state: "",
  gst_number: "",
  pan_number: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Edits this vendor; without it the dialog adds one.
  vendorId?: number;
  // Handed the vendor as saved, with its code once it has one.
  onSaved?: (vendor: SavedVendor) => void;
}

export type SavedVendor = { id: number; code?: string; name: string };

// Adds or edits a vendor, which every office shares.
const VendorFormDialog = ({
  open,
  onOpenChange,
  vendorId,
  onSaved,
}: Props) => {
  const isEdit = !!vendorId;
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const form = useForm<VendorFormInput, unknown, VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const vendorQuery = trpc.contractorQuery.getContractor.useQuery(
    { id: vendorId ?? 0 },
    { enabled: open && isEdit },
  );
  const vendor = vendorQuery.data?.contractor;

  // Re-seed on every open so a cancelled edit doesn't linger.
  useEffect(() => {
    if (!open) return;
    form.reset(
      isEdit && vendor
        ? {
            name: vendor.name,
            contact_number: vendor.contact_number ?? "",
            email: vendor.email ?? "",
            address: vendor.address ?? "",
            state: vendor.state ?? "",
            gst_number: vendor.gst_number ?? "",
            pan_number: vendor.pan_number ?? "",
          }
        : EMPTY_FORM,
    );
  }, [open, isEdit, vendor, form]);

  const handleClose = () => onOpenChange(false);

  const handleSaved = (message: string, saved: SavedVendor) => {
    toast.success(message);
    utils.contractorQuery.invalidate();
    onSaved?.(saved);
    handleClose();
  };

  const createVendor = trpc.contractorMutation.createContractor.useMutation({
    onSuccess: (data: { id: number; code: string }, input: { name: string }) =>
      handleSaved("Vendor added", {
        id: data.id,
        code: data.code,
        name: input.name,
      }),
    onError: (error: any) => handleError(error, { showToast: true }),
  });

  const updateVendor = trpc.contractorMutation.updateContractor.useMutation({
    onSuccess: (_data: unknown, input: { name?: string }) =>
      handleSaved("Vendor updated", { id: vendorId!, name: input.name ?? "" }),
    onError: (error: any) => handleError(error, { showToast: true }),
  });

  function onSubmit(fields: VendorFormValues) {
    if (isEdit) {
      updateVendor.mutate({ id: vendorId!, ...fields });
    } else {
      createVendor.mutate(fields);
    }
  }

  return (
    <DialogWindow
      open={open}
      setOpen={handleClose}
      isLoading={isEdit && vendorQuery.isLoading}
      title={isEdit ? "Edit Vendor" : "Add Vendor"}
      description={VENDOR_DESCRIPTION}
      size='md'
      heightMode='auto'>
      {isEdit && !vendorQuery.isLoading && !vendor ? (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          This vendor could not be found.
        </p>
      ) : (
        <Form {...form}>
          <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
            <CustomInput
              control={form.control}
              fieldName='name'
              Label='Vendor Name'
              placeholder='e.g. Sharma Earthmovers'
            />

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <CustomInput
                control={form.control}
                fieldName='contact_number'
                Label='Contact Number'
                placeholder='98765 43210 or 011-23456789'
                optional
              />
              <CustomInput
                control={form.control}
                fieldName='email'
                Label='Email'
                placeholder='name@company.com'
                optional
              />
              <CustomInput
                control={form.control}
                fieldName='gst_number'
                Label='GST Number'
                placeholder='e.g. 22AAAAA0000A1Z5'
                optional
              />
              <CustomInput
                control={form.control}
                fieldName='pan_number'
                Label='PAN'
                placeholder='e.g. ABCDE1234F'
                optional
              />
              <CustomInput
                control={form.control}
                fieldName='state'
                Label='State'
                placeholder='e.g. Assam'
                optional
              />
            </div>

            <CustomInput
              control={form.control}
              fieldName='address'
              Label='Address'
              placeholder='Office or yard address'
              isTextArea
              optional
            />

            <div className='flex justify-end gap-4 border-t pt-4'>
              <CustomButton
                type='button'
                text='Cancel'
                variant='secondary'
                onClick={handleClose}
              />
              <CustomButton
                type='submit'
                text={isEdit ? "Save Changes" : "Add Vendor"}
                variant='primary'
                loading={createVendor.isPending || updateVendor.isPending}
                disableForViewer
              />
            </div>
          </CustomForm>
        </Form>
      )}
    </DialogWindow>
  );
};

export default VendorFormDialog;

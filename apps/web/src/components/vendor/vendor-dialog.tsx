"use client";
import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { z } from "zod";
import { constants } from "@pkg/utils";
import { vendorSchemas } from "@pkg/schema";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import CustomInput from "@/components/shared/input";
import OfficeSelect from "@/components/shared/office-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";

const { STATUS } = constants;

const vendorFormSchema = vendorSchemas.createVendorSchema.extend({
  status: vendorSchemas.vendorStatusEnum,
});
type VendorFormInput = z.input<typeof vendorFormSchema>;
type VendorFormValues = z.output<typeof vendorFormSchema>;

const EMPTY_FORM: VendorFormInput = {
  office_id: undefined as unknown as number,
  name: "",
  contact_number: "",
  email: "",
  address: "",
  gst_number: "",
  pan_number: "",
  status: STATUS.ACTIVE,
};

type OfficeOption = { id: number; name: string; status: string };

const statusOptions = [
  { value: STATUS.ACTIVE, label: "Active" },
  { value: STATUS.INACTIVE, label: "Inactive" },
];

// Adds (dialog=create-vendor) or edits (dialog=edit-vendor&vendorId=…) a
// vendor. A vendor belongs to one office and stays there.
const VendorDialog = () => {
  const { getParam, deleteParams } = useHandleParams();
  const dialog = getParam("dialog");
  const isEdit = dialog === "edit-vendor";
  const isOpen = isEdit || dialog === "create-vendor";
  const vendorId = Number(getParam("vendorId"));
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const form = useForm<VendorFormInput, unknown, VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: EMPTY_FORM,
  });

  const vendorQuery = trpc.contractorQuery.getContractor.useQuery(
    { id: vendorId },
    { enabled: isEdit && vendorId > 0 },
  );
  const vendor = vendorQuery.data?.contractor;

  const { data: officesData, isLoading: isLoadingOffices } =
    trpc.officeQuery.getOffices.useQuery(
      { searchQuery: "", status: "all" },
      { enabled: isOpen },
    );
  const offices: OfficeOption[] = officesData?.offices ?? [];
  const vendorOffice = offices.find(
    (office) => office.id === vendor?.office_id,
  );

  // Re-seed on every open so a cancelled edit doesn't linger.
  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      isEdit && vendor
        ? {
            office_id: vendor.office_id,
            name: vendor.name,
            contact_number: vendor.contact_number ?? "",
            email: vendor.email ?? "",
            address: vendor.address ?? "",
            gst_number: vendor.gst_number ?? "",
            pan_number: vendor.pan_number ?? "",
            status: vendor.status,
          }
        : EMPTY_FORM,
    );
  }, [isOpen, isEdit, vendor, form]);

  const handleClose = useCallback(() => {
    deleteParams(["dialog", "vendorId"]);
  }, [deleteParams]);

  const handleSaved = (message: string) => {
    toast.success(message);
    utils.contractorQuery.invalidate();
    handleClose();
  };

  const createVendor = trpc.contractorMutation.createContractor.useMutation({
    onSuccess: () => handleSaved("Vendor added"),
    onError: (error: any) => handleError(error, { showToast: true }),
  });

  const updateVendor = trpc.contractorMutation.updateContractor.useMutation({
    onSuccess: () => handleSaved("Vendor updated"),
    onError: (error: any) => handleError(error, { showToast: true }),
  });

  function onSubmit({ office_id, status, ...fields }: VendorFormValues) {
    if (isEdit) {
      updateVendor.mutate({ id: vendorId, status, ...fields });
    } else {
      createVendor.mutate({ office_id, ...fields });
    }
  }

  return (
    <DialogWindow
      open={isOpen}
      setOpen={handleClose}
      isLoading={isEdit && vendorQuery.isLoading}
      title={isEdit ? "Edit Vendor" : "Add Vendor"}
      description='A vendor is a contractor an office gives restoration work to.'
      size='md'
      heightMode='auto'>
      {isEdit && !vendorQuery.isLoading && !vendor ? (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          This vendor could not be found.
        </p>
      ) : (
        <Form {...form}>
          <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <CustomInput
                control={form.control}
                fieldName='name'
                Label='Vendor Name'
                placeholder='e.g. Sharma Earthmovers'
              />

              {isEdit ? (
                <div className='space-y-1 min-w-0'>
                  <p className='text-xs font-medium text-neutral-700'>Office</p>
                  <p className='flex h-9 items-center truncate rounded-md bg-gray-100/50 px-3 text-sm text-gray-700'>
                    {vendorOffice?.name ?? "—"}
                  </p>
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name='office_id'
                  render={({ field }) => (
                    <FormItem className='space-y-1 min-w-0'>
                      <FormLabel className='text-xs font-medium text-neutral-700'>
                        Office
                      </FormLabel>
                      <FormControl>
                        <OfficeSelect
                          offices={offices.filter(
                            (office) => office.status === STATUS.ACTIVE,
                          )}
                          value={field.value}
                          onChange={field.onChange}
                          isLoading={isLoadingOffices}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              )}

              <CustomInput
                control={form.control}
                fieldName='contact_number'
                Label='Contact Number'
                placeholder='10 digit mobile number'
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
            </div>

            <CustomInput
              control={form.control}
              fieldName='address'
              Label='Address'
              placeholder='Office or yard address'
              isTextArea
              optional
            />

            {isEdit && (
              <CustomInput
                control={form.control}
                fieldName='status'
                Label='Status'
                isSelect
                selectOptions={statusOptions}
              />
            )}

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

export default VendorDialog;

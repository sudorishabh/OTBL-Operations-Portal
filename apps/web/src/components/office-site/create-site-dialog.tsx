"use client";
import React, { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DialogWindow from "@/components/shared/dialog-window";
import { Form } from "@/components/ui/form";
import CustomButton from "@/components/shared/btn";
import { trpc } from "@/lib/trpc";
import CustomForm from "@/components/shared/form";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import Input from "@/components/shared/input";
import { Building2, MapPin, Globe, Hash } from "lucide-react";
import { useApiError } from "@/hooks/useApiError";
import { siteSchemas, type siteTypes } from "@pkg/schema";
import useHandleParams from "@/hooks/useHandleParams";

const CreateSiteDialog = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { deleteParams, getParam } = useHandleParams();
  const dialog = getParam("dialog");
  const officeId = getParam("officeId");
  const officeName = getParam("officeName");
  const siteId = getParam("siteId");
  const isCreateMode = dialog === "create-site";
  const isEditMode = dialog === "update-site";
  const isOpenDialog = isCreateMode || isEditMode;

  const form = useForm<siteTypes.siteBaseType>({
    resolver: zodResolver(siteSchemas.siteBaseSchema),
    defaultValues: {
      name: "",
      address: "",
      state: "",
      city: "",
      pincode: "",
    },
  });

  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const { data: siteData, isLoading: isSiteLoading } =
    trpc.siteQuery.getSite.useQuery(
      { siteId: Number(siteId) },
      { enabled: isEditMode && !!siteId },
    );

  const createSite = trpc.siteMutation.createSite.useMutation({
    onSuccess: () => {
      toast.success("Site added successfully");
      utils.officeQuery.getOffices.invalidate();
      utils.siteQuery.getSitesByOfficeId.invalidate();
      utils.siteQuery.get6SitesByOfficeId.invalidate();
      handleClose();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const editSite = trpc.siteMutation.updateSite.useMutation({
    onSuccess: () => {
      toast.success("Site updated successfully");
      utils.officeQuery.getOffices.invalidate();
      utils.siteQuery.getSitesByOfficeId.invalidate();
      handleClose();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  const handleClose = useCallback(() => {
    deleteParams(["dialog", "officeId", "officeName", "siteId"]);
    form.reset({
      name: "",
      address: "",
      city: "",
      pincode: "",
      state: "",
    });
  }, [searchParams, router, form]);

  useEffect(() => {
    if (isEditMode && siteData && !isSiteLoading) {
      form.reset({
        name: siteData.name || "",
        address: siteData.address || "",
        city: siteData.city || "",
        state: siteData.state || "",
        pincode: siteData.pincode || "",
      });
    } else if (isCreateMode) {
      form.reset({
        name: "",
        address: "",
        city: "",
        pincode: "",
        state: "",
      });
    }
  }, [isEditMode, isCreateMode, siteData, isSiteLoading, form]);

  async function onSubmit(values: siteTypes.siteBaseType) {
    try {
      if (isEditMode && siteId) {
        await editSite.mutateAsync({ ...values, siteId: Number(siteId) });
      } else if (isCreateMode && officeId) {
        await createSite.mutateAsync({
          ...values,
          office_id: Number(officeId),
        });
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  }

  return (
    <DialogWindow
      title={
        isEditMode
          ? "Edit Site"
          : `Add Site${officeName ? ` to ${officeName}` : ""}`
      }
      description={
        isEditMode ? "Update site information" : "Create a new site"
      }
      open={isOpenDialog}
      size='sm'
      isLoading={isSiteLoading}
      setOpen={handleClose}>
      <Form {...form}>
        <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
          <div className='max-h-[60vh] overflow-y-auto pr-2 space-y-6'>
            <div className='space-y-4'>
              {isCreateMode && (
                <div className='border-b pb-2'>
                  <h3 className='text-base font-semibold text-gray-800'>
                    Site Information
                  </h3>
                </div>
              )}

              <Input
                control={form.control}
                fieldName='name'
                Label='Site Name'
                LabelIcon={Building2}
                placeholder='Enter site name'
              />

              <Input
                control={form.control}
                fieldName='address'
                Label='Address'
                LabelIcon={MapPin}
                placeholder='Enter address'
              />

              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <Input
                  control={form.control}
                  fieldName='city'
                  Label='City'
                  LabelIcon={Globe}
                  placeholder='Enter city'
                />

                <Input
                  control={form.control}
                  fieldName='state'
                  Label='State'
                  LabelIcon={Globe}
                  placeholder='Enter state'
                />

                <Input
                  control={form.control}
                  fieldName='pincode'
                  Label='Pincode'
                  LabelIcon={Hash}
                  placeholder='Enter pincode'
                />
              </div>
            </div>

            <div className='flex justify-end gap-4 pt-4 border-t'>
              <CustomButton
                type='button'
                text='Cancel'
                variant='secondary'
                onClick={handleClose}
              />
              <CustomButton
                type='submit'
                text={isEditMode ? "Update" : "Create Site"}
                variant='primary'
                loading={form.formState.isSubmitting}
                disabled={form.formState.isSubmitting}
                disableForViewer
              />
            </div>
          </div>
        </CustomForm>
      </Form>
    </DialogWindow>
  );
};

export default CreateSiteDialog;

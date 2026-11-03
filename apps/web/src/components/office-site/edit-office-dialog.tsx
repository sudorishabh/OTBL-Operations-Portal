"use client";
import React, { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Activity } from "lucide-react";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import Input from "@/components/shared/input";
import { Form } from "@/components/ui/form";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import { officeSchemas, officeTypes } from "@pkg/schema";
import { constants } from "@pkg/utils";
import OfficeInfoFields from "./office-info-fields";

const { STATUS } = constants;

const EditOfficeDialog = () => {
  const { getParam, deleteParams } = useHandleParams();
  const isOpenDialog = getParam("dialog") === "edit-office";
  const officeId = Number(getParam("officeId"));
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const form = useForm<officeTypes.updateOfficeType>({
    resolver: zodResolver(officeSchemas.updateOfficeSchema),
  });

  const { data: officesData, isLoading } = trpc.officeQuery.getOffices.useQuery(
    {},
    { enabled: isOpenDialog && !!officeId },
  );
  const office = officesData?.offices?.find((o: any) => o.id === officeId);

  // Re-seed on every open so a cancelled edit doesn't linger.
  useEffect(() => {
    if (!isOpenDialog || !office) return;
    form.reset({
      id: office.id,
      name: office.name,
      email: office.email,
      address: office.address,
      state: office.state,
      city: office.city,
      pincode: office.pincode,
      gst_number: office.gst_number,
      status: office.status,
    });
  }, [isOpenDialog, office, form]);

  const handleClose = useCallback(() => {
    deleteParams(["dialog", "officeId", "officeName"]);
  }, [deleteParams]);

  const updateOffice = trpc.officeMutation.updateOffice.useMutation({
    onSuccess: () => {
      toast.success("Office updated successfully");
      utils.officeQuery.getOffices.invalidate();
      handleClose();
    },
    onError: (error: any) => {
      handleError(error, { showToast: true });
    },
  });

  function onSubmit(values: officeTypes.updateOfficeType) {
    updateOffice.mutate(values);
  }

  return (
    <DialogWindow
      open={isOpenDialog}
      setOpen={handleClose}
      isLoading={isLoading}
      title='Edit Office'
      description='Update the office details'
      size='lg'
      heightMode='auto'>
      {!office ? (
        <p className='py-10 text-center text-sm text-muted-foreground'>
          This office could not be found.
        </p>
      ) : (
        <Form {...form}>
          <CustomForm onSubmit={form.handleSubmit(onSubmit)}>
            <OfficeInfoFields />

            <Input
              control={form.control}
              fieldName='status'
              Label='Status'
              LabelIcon={Activity}
              isSelect
              selectOptions={[
                { label: "Active", value: STATUS.ACTIVE },
                { label: "Inactive", value: STATUS.INACTIVE },
              ]}
            />

            <div className='flex justify-end gap-4 pt-4 border-t'>
              <CustomButton
                type='button'
                text='Cancel'
                variant='secondary'
                onClick={handleClose}
              />
              <CustomButton
                type='submit'
                text='Save Changes'
                variant='primary'
                loading={updateOffice.isPending}
                disableForViewer
              />
            </div>
          </CustomForm>
        </Form>
      )}
    </DialogWindow>
  );
};

export default EditOfficeDialog;

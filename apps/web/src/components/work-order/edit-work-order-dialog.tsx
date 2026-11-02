"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import toast from "react-hot-toast";
import { z } from "zod";
import { workOrderSchemas } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import {
  toDocuments,
  toStoredDocument,
  type StoredDocument,
} from "@/lib/documents";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import CustomForm from "@/components/shared/form";
import { Form } from "@/components/ui/form";
import WorkOrderDetailsFields from "@/components/client/client-proposals-WO/create-wo/work-order-details-fields";

// Documents are picked as files and uploaded on save, so the form omits them.
const editFormSchema = workOrderSchemas.baseWorkOrderSchema.omit({
  documents: true,
  process_type: true,
  schedule_of_rates: true,
});
type EditFormInput = z.input<typeof editFormSchema>;
type EditFormValues = z.output<typeof editFormSchema>;

interface Props {
  // The work order as getWorkOrderDetails returns it.
  workOrder: any;
}

const toFormValues = (workOrder: any): EditFormInput => ({
  code: workOrder.code,
  agreement_number: workOrder.agreement_number,
  rate_contract_number: workOrder.rate_contract_number,
  title: workOrder.title,
  start_date: new Date(workOrder.start_date),
  end_date: new Date(workOrder.end_date),
  handing_over_date: new Date(workOrder.handing_over_date),
  description: workOrder.description ?? "",
  job_number: workOrder.job_number,
  joint_estimate_number: workOrder.joint_estimate_number,
  area: workOrder.area,
  installation_type: workOrder.installation_type,
  land_owner_name: workOrder.land_owner_name,
  remarks: workOrder.remarks ?? "",
});

// Lets an admin correct a work order's details and documents at any status.
const EditWorkOrderDialog = ({ workOrder }: Props) => {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);
  const [filesError, setFilesError] = useState("");
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: "/WorkOrders",
    // The folder is shared by all work orders; never overwrite another's file.
    conflictBehavior: "rename",
  });

  const form = useForm<EditFormInput, unknown, EditFormValues>({
    resolver: zodResolver(editFormSchema),
  });

  const updateWorkOrder = trpc.workOrderMutation.updateWorkOrder.useMutation({
    onSuccess: async () => {
      toast.success("Work order updated");
      setOpen(false);
      await Promise.all([
        utils.workOrderQuery.getWorkOrderDetails.invalidate({
          id: workOrder.id,
        }),
        // The restoration runs over the work order's dates.
        utils.restorationQuery.getRestoration.invalidate(),
      ]);
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  });

  const openDialog = () => {
    form.reset(toFormValues(workOrder));
    setFiles([]);
    setSavedDocuments(toDocuments(workOrder.documents));
    setFilesError("");
    resetUpload();
    setOpen(true);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) return;
    if (isUploading) {
      toast.error("Please wait for the document to finish uploading.");
      return;
    }
    setOpen(false);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (savedDocuments.length + files.length === 0) {
      setFilesError("Upload at least one document");
      return;
    }

    const uploaded = files.length > 0 ? await uploadFiles(files) : [];
    if (!uploaded) return;

    updateWorkOrder.mutate({
      ...values,
      id: workOrder.id,
      documents: [...savedDocuments, ...uploaded.map(toStoredDocument)],
    });
  });

  const isSaving =
    form.formState.isSubmitting || updateWorkOrder.isPending || isUploading;

  return (
    <>
      <button
        type='button'
        title='Edit work order'
        onClick={openDialog}
        className='inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
        <Pencil className='size-3' />
        Edit
      </button>

      <DialogWindow
        title='Edit Work Order'
        description={`${workOrder.code} - ${workOrder.title}`}
        heightMode='full'
        open={open}
        size='2xl'
        setOpen={handleOpenChange}>
        <Form {...form}>
          <CustomForm
            onSubmit={onSubmit}
            className='h-full flex flex-col'>
            <div className='flex-1 flex flex-col justify-between h-full'>
              <WorkOrderDetailsFields
                showProcessType={false}
                files={files}
                onFilesChange={(next) => {
                  setFiles(next);
                  if (next.length > 0) setFilesError("");
                }}
                existing={savedDocuments}
                onRemoveExisting={(index) =>
                  setSavedDocuments((prev) =>
                    prev.filter((_, i) => i !== index),
                  )
                }
                filesError={filesError}
                isUploading={isUploading}
                progress={progress}
              />

              <div className='flex items-center justify-end gap-3 pt-4'>
                <CustomButton
                  type='button'
                  text='Cancel'
                  variant='outline'
                  onClick={() => handleOpenChange(false)}
                  disabled={isSaving}
                />
                <CustomButton
                  type='submit'
                  text={isUploading ? "Uploading..." : "Save changes"}
                  variant='primary'
                  loading={isSaving}
                  disabled={isSaving}
                />
              </div>
            </div>
          </CustomForm>
        </Form>
      </DialogWindow>
    </>
  );
};

export default EditWorkOrderDialog;

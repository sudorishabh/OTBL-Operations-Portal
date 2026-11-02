"use client";
import React, { useState } from "react";
import { Award } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { useIsViewer } from "@/contexts/AuthContext";
import {
  toDocuments,
  toStoredDocument,
  type StoredDocument,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import type { JobOrder } from "./job-order-dialog";

interface Props {
  restorationId: number;
  jobOrder: JobOrder;
}

// A job order's completion certificates, shown as a badge on its row that
// opens them for viewing or uploading.
const JobOrderCertificates = ({ restorationId, jobOrder }: Props) => {
  const isViewer = useIsViewer();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);

  const certificates = toDocuments(jobOrder.documents);

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Restoration/${restorationId}/JobOrders/${jobOrder.id}`,
    conflictBehavior: "rename",
  });

  const saveCertificates = trpc.jobOrderMutation.setJobOrderCertificates.useMutation(
    {
      onSuccess: async () => {
        toast.success("Certificates saved");
        setOpen(false);
        await utils.jobOrderQuery.getJobOrders.invalidate({
          work_order_site_id: restorationId,
        });
      },
      onError: (error: unknown) => handleError(error, { showToast: true }),
    },
  );

  const save = async () => {
    const uploaded = files.length > 0 ? await uploadFiles(files) : [];
    if (!uploaded) return;
    saveCertificates.mutate({
      id: jobOrder.id,
      documents: [...savedDocuments, ...uploaded.map(toStoredDocument)],
    });
  };

  const isSaving = isUploading || saveCertificates.isPending;

  return (
    <>
      <button
        type='button'
        title='Completion certificates'
        onClick={() => {
          setFiles([]);
          setSavedDocuments(certificates);
          resetUpload();
          setOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
          certificates.length > 0
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
        )}>
        <Award className='size-3' />
        {certificates.length > 0
          ? `${certificates.length} certificate${certificates.length !== 1 ? "s" : ""}`
          : "No certificate"}
      </button>

      <DialogWindow
        title={`${jobOrder.jo_number} Completion Certificates`}
        description={jobOrder.title}
        size='md'
        heightMode='auto'
        open={open}
        setOpen={(next) => {
          if (!next && !isSaving) setOpen(false);
        }}>
        <div className='space-y-4 py-2'>
          <DocumentsField
            label='Completion certificates'
            files={isViewer ? [] : files}
            onFilesChange={setFiles}
            existing={savedDocuments}
            onRemoveExisting={
              isViewer
                ? undefined
                : (index) =>
                    setSavedDocuments((prev) =>
                      prev.filter((_, i) => i !== index),
                    )
            }
            isUploading={isUploading}
            progress={progress}
          />
          {!isViewer && (
            <div className='flex justify-end gap-2'>
              <CustomButton
                type='button'
                variant='outline'
                text='Cancel'
                disabled={isSaving}
                onClick={() => setOpen(false)}
              />
              <CustomButton
                type='button'
                variant='primary'
                text='Save certificates'
                loading={isSaving}
                disabled={isSaving}
                onClick={save}
              />
            </div>
          )}
        </div>
      </DialogWindow>
    </>
  );
};

export default JobOrderCertificates;

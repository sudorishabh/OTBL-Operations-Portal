"use client";
import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import type { Restoration } from "./restoration-section";

const CERTIFICATE = "completion_certificate";

interface Props {
  restoration: Restoration;
  workOrderId: number;
}

// Restoration records no completion quantities: uploading the completion
// certificate and marking it complete is all there is.
const RestorationCompletion = ({ restoration, workOrderId }: Props) => {
  const utils = trpc.useUtils();
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const isCompleted = restoration.is_completed;

  const documentsQuery = trpc.workOrderSiteQuery.getSiteDocuments.useQuery({
    work_order_site_id: restoration.id,
  });
  const certificates = (
    (documentsQuery.data ?? []) as {
      id: number;
      type: string;
      document_url: string;
      document_id: string | null;
    }[]
  ).filter((doc) => doc.type === CERTIFICATE);

  const { uploadFiles, isUploading, progress } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${restoration.id}/completion`,
    conflictBehavior: "rename",
  });

  const refreshDocuments = () =>
    utils.workOrderSiteQuery.getSiteDocuments.invalidate({
      work_order_site_id: restoration.id,
    });

  const createDocument =
    trpc.workOrderSiteMutation.createSiteDocument.useMutation();
  const deleteDocument =
    trpc.workOrderSiteMutation.deleteSiteDocument.useMutation({
      onSuccess: () => {
        toast.success("Certificate removed");
        refreshDocuments();
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });
  const completeRestoration =
    trpc.restorationMutation.completeRestoration.useMutation();

  const save = async () => {
    if (certificates.length + files.length === 0) {
      toast.error("Upload the completion certificate first.");
      return;
    }

    setIsSaving(true);
    try {
      if (files.length > 0) {
        const uploaded = await uploadFiles(files);
        if (!uploaded) return;
        for (const doc of uploaded) {
          await createDocument.mutateAsync({
            work_order_site_id: restoration.id,
            type: CERTIFICATE,
            document_url: doc.webUrl,
            document_id: doc.id,
          });
        }
        setFiles([]);
        refreshDocuments();
      }

      if (!isCompleted) {
        await completeRestoration.mutateAsync({
          work_order_site_id: restoration.id,
        });
        utils.restorationQuery.getRestoration.invalidate({
          work_order_id: workOrderId,
        });
      }
      toast.success(
        isCompleted ? "Certificate uploaded" : "Restoration completed",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't save the completion.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='space-y-3 rounded-xl border border-slate-200 bg-gray-100/50 p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h4 className='text-sm font-semibold text-gray-800'>
            Completion certificate
          </h4>
          <p className='text-xs text-gray-500'>
            {isCompleted
              ? "The restoration is complete."
              : "Upload it, then mark the restoration complete."}
          </p>
        </div>
        {isCompleted && (
          <span className='inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100'>
            <CheckCircle2 className='size-3.5' />
            Completed
          </span>
        )}
      </div>

      <DocumentsField
        label='Upload completion certificate'
        files={files}
        onFilesChange={setFiles}
        existing={certificates.map((doc, index) => ({
          url: doc.document_url,
          id: doc.document_id ?? null,
          name: `Completion certificate ${index + 1}`,
        }))}
        onRemoveExisting={(index) => {
          const doc = certificates[index];
          if (doc && confirm("Delete this certificate?")) {
            deleteDocument.mutate({ id: doc.id });
          }
        }}
        isUploading={isUploading}
        progress={progress}
        className='rounded-xl'
      />

      {(!isCompleted || files.length > 0) && (
        <div className='flex justify-end'>
          <CustomButton
            variant='primary'
            Icon={isCompleted ? undefined : CheckCircle2}
            text={
              isCompleted ? "Upload certificate" : "Mark restoration complete"
            }
            loading={isSaving}
            disabled={isSaving}
            onClick={save}
            disableForViewer
          />
        </div>
      )}
    </div>
  );
};

export default RestorationCompletion;

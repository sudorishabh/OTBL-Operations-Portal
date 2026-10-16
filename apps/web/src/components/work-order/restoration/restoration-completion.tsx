"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import type { Restoration } from "./restoration-section";

const CERTIFICATE = "completion_certificate";

interface Props {
  restoration: Restoration;
}

// The restoration's completion certificate. The restoration completes on its
// own once its expenses use up the schedule of rates, so this only uploads.
const RestorationCompletion = ({ restoration }: Props) => {
  const utils = trpc.useUtils();
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
  const upload = async () => {
    if (files.length === 0) return;

    setIsSaving(true);
    try {
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
      toast.success("Certificate uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't upload the certificate.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='space-y-3 rounded-xl border border-slate-200 bg-gray-100/50 p-4'>
      <div>
        <h4 className='text-sm font-semibold text-gray-800'>
          Completion certificate
        </h4>
        <p className='text-xs text-gray-500'>
          Attach the signed certificate for the restoration.
        </p>
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

      {files.length > 0 && (
        <div className='flex justify-end'>
          <CustomButton
            variant='primary'
            text='Upload certificate'
            loading={isSaving}
            disabled={isSaving}
            onClick={upload}
            disableForViewer
          />
        </div>
      )}
    </div>
  );
};

export default RestorationCompletion;

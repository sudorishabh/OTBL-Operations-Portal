"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { FileCheck, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import UploadSectionHeader from "@/components/shared/upload-section-header";
import type { Restoration } from "./restoration-section";

const CERTIFICATE = "completion_certificate";

interface Props {
  restoration: Restoration;
}

// The restoration's completion certificate. The restoration completes on its
// own once its completion certificates use up the schedule of rates, so this
// only uploads.
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
    <div className='space-y-2 rounded-lg border border-gray-200 bg-white p-4'>
      <UploadSectionHeader
        Icon={FileCheck}
        title='Completion certificate'
        description='The signed certificate for the finished restoration.'
      />

      <DocumentsField
        isLoading={documentsQuery.isLoading}
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
        action={
          files.length > 0 && (
            <CustomButton
              variant='primary'
              Icon={Upload}
              text='Upload certificate'
              loading={isSaving}
              disabled={isSaving}
              onClick={upload}
              className='h-7 px-2.5 text-xs'
              disableForViewer
            />
          )
        }
      />
    </div>
  );
};

export default RestorationCompletion;

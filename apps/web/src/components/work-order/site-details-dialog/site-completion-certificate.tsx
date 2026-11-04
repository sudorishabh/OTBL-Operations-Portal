"use client";
import React, { useState } from "react";
import { FileCheck, Lock, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import UploadSectionHeader from "@/components/shared/upload-section-header";

const CERTIFICATE = "completion_certificate";

interface Props {
  woSiteId: number;
}

const CertificateHeader = () => (
  <UploadSectionHeader
    Icon={FileCheck}
    title='Completion Certificate'
    description='The signed certificate for the finished site.'
  />
);

// The certificate's place until the site is complete, saying when it can be
// uploaded.
export const PendingCompletionCertificate = ({ note }: { note: string }) => (
  <div className='space-y-2'>
    <CertificateHeader />
    <p className='flex min-h-9 items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-500'>
      <Lock className='size-3.5 shrink-0 text-gray-400' />
      {note}
    </p>
  </div>
);

// The site's signed completion certificate.
const SiteCompletionCertificate = ({ woSiteId }: Props) => {
  const utils = trpc.useUtils();
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const documentsQuery = trpc.workOrderSiteQuery.getSiteDocuments.useQuery({
    work_order_site_id: woSiteId,
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
    folderPath: `/WorkOrders/Sites/${woSiteId}/completion`,
    conflictBehavior: "rename",
  });

  const refreshDocuments = () =>
    utils.workOrderSiteQuery.getSiteDocuments.invalidate({
      work_order_site_id: woSiteId,
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
    setIsSaving(true);
    try {
      const uploaded = await uploadFiles(files);
      if (!uploaded) return;
      for (const doc of uploaded) {
        await createDocument.mutateAsync({
          work_order_site_id: woSiteId,
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
    <div className='space-y-2'>
      <CertificateHeader />

      <DocumentsField
        label='Doc upload'
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

export default SiteCompletionCertificate;

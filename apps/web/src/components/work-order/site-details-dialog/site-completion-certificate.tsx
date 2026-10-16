"use client";
import React, { useState } from "react";
import { FileCheck, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";

const CERTIFICATE = "completion_certificate";

interface Props {
  woSiteId: number;
}

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
    <div className='space-y-3'>
      <div>
        <div className='flex items-center gap-2'>
          <FileCheck className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Completion Certificate
          </span>
        </div>
        <p className='mt-0.5 text-[10px] text-gray-400'>
          The signed certificate for the finished site.
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
            Icon={Upload}
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

export default SiteCompletionCertificate;

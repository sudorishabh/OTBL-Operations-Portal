"use client";
import React, { useState } from "react";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";

const MOBILIZATION = "mobilization";

interface Props {
  woSiteId: number;
}

// Documents recording the team and equipment moving onto the site, before
// bioremediation starts.
const MobilizationDocuments = ({ woSiteId }: Props) => {
  const utils = trpc.useUtils();
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const documentsQuery = trpc.workOrderSiteQuery.getSiteDocuments.useQuery({
    work_order_site_id: woSiteId,
  });
  const documents = (
    (documentsQuery.data ?? []) as {
      id: number;
      type: string;
      document_url: string;
      document_id: string | null;
    }[]
  ).filter((doc) => doc.type === MOBILIZATION);

  const { uploadFiles, isUploading, progress } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/Mobilization`,
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
        toast.success("Document removed");
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
          type: MOBILIZATION,
          document_url: doc.webUrl,
          document_id: doc.id,
        });
      }
      setFiles([]);
      refreshDocuments();
      toast.success("Mobilization documents uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't upload the documents.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='space-y-3 rounded-xl border border-slate-200 bg-gray-100/50 p-4'>
      <div>
        <h4 className='text-sm font-semibold text-gray-800'>
          Mobilization documents
        </h4>
        <p className='text-xs text-gray-500'>
          Records of the team and equipment moving onto the site.
        </p>
      </div>

      <DocumentsField
        label='Upload mobilization documents'
        files={files}
        onFilesChange={setFiles}
        existing={documents.map((doc, index) => ({
          url: doc.document_url,
          id: doc.document_id ?? null,
          name: `Mobilization document ${index + 1}`,
        }))}
        onRemoveExisting={(index) => {
          const doc = documents[index];
          if (doc && confirm("Delete this document?")) {
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
            text='Upload documents'
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

// What happens at a bioremediation site before the first application.
const SiteMobilization = ({ woSiteId }: Props) => (
  <div className='space-y-4'>
    <MobilizationDocuments woSiteId={woSiteId} />
  </div>
);

export default SiteMobilization;

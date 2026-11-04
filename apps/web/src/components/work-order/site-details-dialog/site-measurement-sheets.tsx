"use client";
import React, { useState } from "react";
import { FileText, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { useIsViewer } from "@/contexts/AuthContext";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import UploadSectionHeader from "@/components/shared/upload-section-header";

interface Props {
  woSiteId: number | undefined;
}

interface MeasurementSheet {
  id: number;
  document_url: string;
  document_id: string | null;
  created_at: string | null;
}

// The site's measurement sheets: the measurements behind its quantities.
const SiteMeasurementSheets = ({ woSiteId }: Props) => {
  const isViewer = useIsViewer();
  const utils = trpc.useUtils();
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const sheetsQuery = trpc.workOrderSiteQuery.getMeasurementSheets.useQuery(
    { work_order_site_id: woSiteId ?? 0 },
    { enabled: !!woSiteId },
  );
  const sheets = (sheetsQuery.data ?? []) as MeasurementSheet[];

  const { uploadFile, isUploading, progress, reset } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/MeasurementSheets`,
  });

  const refreshSheets = () =>
    utils.workOrderSiteQuery.getMeasurementSheets.invalidate();

  const createSheet =
    trpc.workOrderSiteMutation.createMeasurementSheet.useMutation();
  const deleteSheet =
    trpc.workOrderSiteMutation.deleteMeasurementSheet.useMutation({
      onSuccess: () => {
        toast.success("Measurement sheet deleted");
        refreshSheets();
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });

  const upload = async () => {
    if (files.length === 0 || !woSiteId) return;

    setIsSaving(true);
    try {
      for (const file of files) {
        const result = await uploadFile(file);
        if (result) {
          await createSheet.mutateAsync({
            work_order_site_id: woSiteId,
            document_url: result.webUrl,
            document_id: result.id,
          });
        }
      }
      setFiles([]);
      reset();
      toast.success(
        files.length === 1
          ? "Measurement sheet uploaded"
          : "Measurement sheets uploaded",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload the sheets.",
      );
    } finally {
      setIsSaving(false);
      refreshSheets();
    }
  };

  return (
    <div className='min-w-0 space-y-2'>
      <UploadSectionHeader
        Icon={FileText}
        title='Measurement Sheet'
        description="The site's measurements behind the quantities."
      />

      <DocumentsField
        label='Doc upload'
        files={files}
        onFilesChange={setFiles}
        existing={sheets.map((sheet, index) => ({
          url: sheet.document_url,
          id: sheet.document_id ?? null,
          name: `Measurement sheet ${index + 1}`,
        }))}
        existingMeta={(index) => {
          const createdAt = sheets[index]?.created_at;
          return createdAt
            ? `Added ${format(new Date(createdAt), "d MMM yy")}`
            : "Saved";
        }}
        onRemoveExisting={
          isViewer
            ? undefined
            : (index) => {
                const sheet = sheets[index];
                if (sheet && confirm("Delete this measurement sheet?")) {
                  deleteSheet.mutate({ id: sheet.id });
                }
              }
        }
        // Sheets have no overall cap; this limits one upload to the usual
        // number of files.
        maxFiles={sheets.length + constants.MAX_DOCUMENTS}
        isUploading={isSaving || isUploading}
        progress={progress}
        action={
          files.length > 0 && (
            <CustomButton
              variant='primary'
              Icon={Upload}
              text={
                files.length === 1
                  ? "Upload sheet"
                  : `Upload ${files.length} sheets`
              }
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

export default SiteMeasurementSheets;

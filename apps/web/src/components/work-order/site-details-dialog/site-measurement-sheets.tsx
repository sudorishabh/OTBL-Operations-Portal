"use client";
import React, { useCallback, useState } from "react";
import { ExternalLink, FileText, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { useIsViewer } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DeferredFilePicker from "@/components/shared/deferred-file-picker";
import CustomButton from "@/components/shared/btn";

interface Props {
  woSiteId: number | undefined;
}

// The site's measurement sheets: the measurements behind its quantities.
const SiteMeasurementSheets = ({ woSiteId }: Props) => {
  const isViewer = useIsViewer();
  const [measurementSheetFiles, setMeasurementSheetFiles] = useState<File[]>(
    [],
  );
  const [isUploadingAll, setIsUploadingAll] = useState(false);

  const utils = trpc.useUtils();

  const { data: measurementSheetDocsNew } = (
    trpc.workOrderSiteQuery as any
  ).getMeasurementSheets.useQuery(
    { work_order_site_id: woSiteId ?? 0 },
    { enabled: !!woSiteId },
  );

  const measurementSheetDocs = measurementSheetDocsNew || [];

  const measurementSheetUpload = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/MeasurementSheets`,
  });

  const createMeasurementSheetMutation = (
    trpc.workOrderSiteMutation as any
  ).createMeasurementSheet.useMutation({
    onSuccess: () => {
      (utils.workOrderSiteQuery as any).getMeasurementSheets.invalidate();
      toast.success("Measurement sheet added");
    },
  });

  const deleteMeasurementSheetMutation = (
    trpc.workOrderSiteMutation as any
  ).deleteMeasurementSheet.useMutation({
    onSuccess: () => {
      (utils.workOrderSiteQuery as any).getMeasurementSheets.invalidate();
      toast.success("Document deleted");
    },
  });

  const handleMeasurementSheetFileSelect = useCallback((file: File | null) => {
    if (file) {
      setMeasurementSheetFiles((prev) => [...prev, file]);
    }
  }, []);

  const handleRemovePendingFile = (index: number) => {
    setMeasurementSheetFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (measurementSheetFiles.length === 0 || !woSiteId) return;

    setIsUploadingAll(true);
    try {
      for (const file of measurementSheetFiles) {
        const result = await measurementSheetUpload.uploadFile(file);
        if (result) {
          await createMeasurementSheetMutation.mutateAsync({
            work_order_site_id: woSiteId,
            document_url: result.webUrl,
            document_id: result.id,
          });
        }
      }
      setMeasurementSheetFiles([]);
      measurementSheetUpload.reset();
      toast.success("All files uploaded successfully");
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploadingAll(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMeasurementSheetMutation.mutate({ id });
    }
  };
  return (
    <div className='min-w-0'>
      <div className='mb-3'>
        <div className='flex items-center gap-2'>
          <FileText className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Measurement Sheet
          </span>
        </div>
        <p className='mt-0.5 text-[10px] text-gray-400'>
          The site's measurements behind the quantities.
        </p>
      </div>

      <DeferredFilePicker
        label='Select Measurement Sheets'
        selectedFile={null}
        onFileSelect={handleMeasurementSheetFileSelect}
        multiple={true}
        fileCount={measurementSheetFiles.length}
        isUploadBgWhite={true}
      />

      {measurementSheetFiles.length > 0 && (
        <div className='mt-3 space-y-2'>
          <div className='flex items-center justify-between px-1'>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] font-bold text-amber-600 uppercase tracking-widest'>
                Pending Upload
              </span>
              <Badge
                variant='outline'
                className='text-[9px] px-1.5 py-0 h-4 bg-amber-50 text-amber-600 border-amber-200'>
                {measurementSheetFiles.length}
              </Badge>
            </div>
            <button
              onClick={() => setMeasurementSheetFiles([])}
              className='text-[10px] text-red-500 hover:text-red-600 font-medium transition-colors'>
              Clear All
            </button>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            {measurementSheetFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className='flex items-center justify-between py-1.5 px-2.5 bg-amber-50/30 rounded-lg border border-amber-100 group transition-all'>
                <div className='flex items-center gap-2 min-w-0'>
                  <FileText className='w-3 h-3 text-amber-500 shrink-0' />
                  <span className='text-[11px] text-amber-900 truncate font-medium'>
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={() => handleRemovePendingFile(idx)}
                  className='p-1 text-amber-400 hover:text-red-500 hover:bg-white rounded-md transition-all'>
                  <X className='w-3 h-3' />
                </button>
              </div>
            ))}
          </div>
          <CustomButton
            onClick={handleUploadAll}
            disabled={isUploadingAll || measurementSheetUpload.isUploading}
            variant='primary'
            Icon={Upload}
            text={isUploadingAll ? "Uploading..." : "Upload All"}
            loading={isUploadingAll}
            className='w-full mt-2  h-9 text-xs shadow-sm'
            disableForViewer
          />
          {measurementSheetUpload.isUploading && (
            <div className='mt-1'>
              <Progress
                value={measurementSheetUpload.progress}
                className='h-1'
                indicatorClassName='bg-emerald-500'
              />
            </div>
          )}
        </div>
      )}

      {measurementSheetDocs && measurementSheetDocs.length > 0 && (
        <div className='mt-6 pt-4 border-t border-gray-200/60'>
          <div className='flex items-center justify-between mb-3 px-1'>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] font-bold text-gray-500 uppercase tracking-widest'>
                Uploaded Measurement Sheets
              </span>
              <Badge
                variant='outline'
                className='text-[9px] px-1.5 py-0 h-4 bg-gray-50 text-gray-400 border-gray-200'>
                {measurementSheetDocs.length}
              </Badge>
            </div>
          </div>

          <ScrollArea
            className={`${measurementSheetDocs.length > 4 ? "h-40" : "h-auto"} pr-3`}>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {measurementSheetDocs.map((doc: any, index: number) => (
                <div
                  key={doc.id}
                  className='relative group flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-100 hover:border-emerald-200 hover:shadow-xs transition-all duration-200 overflow-hidden'>

                  <div className='min-w-0 flex-1 py-0.5'>
                    <a
                      href={doc.document_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-[11px] font-medium flex items-center text-gray-600 truncate hover:text-emerald-600 transition-colors leading-tight'>
                      Document {index + 1}
                      <ExternalLink className='inline size-3.5 text-gray-700 ml-1 opacity-40 group-hover:opacity-100 transition-opacity' />
                    </a>
                    {doc.created_at && (
                      <p className='text-[9px] text-gray-400'>
                        {format(new Date(doc.created_at), "dd MMM yy")}
                      </p>
                    )}
                  </div>

                  <div className='opacity-0 group-hover:opacity-100 transition-all duration-200 pr-1'>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type='button'
                            className='p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                            disabled={
                              isViewer ||
                              deleteMeasurementSheetMutation.isPending
                            }>
                            <Trash2 className='w-3 h-3' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side='top'
                          className='text-[10px] px-2 py-1 bg-gray-900 border-gray-800 text-white'>
                          Delete Document
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SiteMeasurementSheets;

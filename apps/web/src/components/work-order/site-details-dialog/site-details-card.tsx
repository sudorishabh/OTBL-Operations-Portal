import { Badge } from "@/components/ui/badge";
import React from "react";
import {
  Calendar,
  MapPin,
  Briefcase,
  User,
  FileText,
  Building2,
  Upload,
  Trash2,
  ExternalLink,
  X,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

import { trpc } from "@/lib/trpc";
import { capitalFirstLetter, constants } from "@pkg/utils";
import { format } from "date-fns";
import { useState, useCallback } from "react";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import toast from "react-hot-toast";
import DeferredFilePicker from "@/components/shared/deferred-file-picker";
import CustomButton from "@/components/shared/btn";

const InfoCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className='flex items-start gap-2.5'>
    <Icon className='w-3.5 h-3.5 text-gray-400 mt-0.5' />
    <div>
      <p className='text-[10px] text-gray-400 uppercase tracking-wide'>
        {label}
      </p>
      <p className='text-gray-700 text-xs font-medium'>{value}</p>
    </div>
  </div>
);

interface WorkOrderSiteDetails {
  id: number;
  end_date: string;
  status: "pending" | "completed" | "cancelled";
  client_id: number;
  work_order_id: number;
  site_id: number;
  date: string;
  process_type: string;
  job_number: string;
  area: string;
  installation_type: string;
  joint_estimate_number: string;
  land_owner_name: string;
  remarks: string;
  created_at: string;
  updated_at: string;
  site: {
    id: number;
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
  };
  work_order: {
    id: number;
    code: string | null;
    title: string | null;
    process_type: string | null;
  };
  activities:
    | {
        id: number;
        work_order_site_id: number;
        created_at: string;
        updated_at: string;
        activity: string;
      }[]
    | undefined;
}

interface Props {
  siteDetails: WorkOrderSiteDetails | undefined | null;
  operatorUploadsCount?: number;
  onOpenOperatorUploads?: () => void;
}

const SiteDetailsCard = ({
  siteDetails,
  operatorUploadsCount = 0,
  onOpenOperatorUploads,
}: Props) => {
  const [measurementSheetFiles, setMeasurementSheetFiles] = useState<File[]>(
    [],
  );
  const [isUploadingAll, setIsUploadingAll] = useState(false);

  const utils = trpc.useUtils();

  const { data: measurementSheetDocsNew } = (
    trpc.workOrderSiteQuery as any
  ).getMeasurementSheets.useQuery(
    { work_order_site_id: siteDetails?.id ?? 0 },
    { enabled: !!siteDetails?.id },
  );

  const measurementSheetDocs = measurementSheetDocsNew || [];

  const measurementSheetUpload = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${siteDetails?.id}/MeasurementSheets`,
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
    if (measurementSheetFiles.length === 0 || !siteDetails?.id) return;

    setIsUploadingAll(true);
    try {
      for (const file of measurementSheetFiles) {
        const result = await measurementSheetUpload.uploadFile(file);
        if (result) {
          await createMeasurementSheetMutation.mutateAsync({
            work_order_site_id: siteDetails.id,
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
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "cancelled":
        return "bg-red-50 text-red-600 border-red-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const processLabel =
    constants.processTypeOptions.find(
      (opt) => opt.value === siteDetails?.process_type,
    )?.label ||
    siteDetails?.process_type ||
    "N/A";
  return (
    <div className='bg-linear-to-br from-gray-50 to-gray-100/50 rounded-xl p-5 border'>
      <div className='flex items-center justify-between mb-4 gap-2'>
        <h3 className='text-xs font-medium text-gray-500 uppercase tracking-wide'>
          Site Information
        </h3>
        <div className='flex items-center gap-2'>
          {operatorUploadsCount > 0 && onOpenOperatorUploads && (
            <button
              type='button'
              onClick={onOpenOperatorUploads}
              title='View operator uploads'
              className='group inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700 shadow-xs cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-sm active:scale-[0.98] transition-all'>
              <FolderOpen className='size-3' />
              <span>
                {operatorUploadsCount} operator{" "}
                {operatorUploadsCount === 1 ? "upload" : "uploads"}
              </span>
              <ChevronRight className='size-3 -mr-0.5 transition-transform group-hover:translate-x-0.5' />
            </button>
          )}
          <Badge
            className={`text-[10px] border ${getStatusColor(siteDetails?.status ?? "pending")}`}>
            {capitalFirstLetter(siteDetails?.status ?? "pending")}
          </Badge>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <InfoCard
          icon={Briefcase}
          label='Process Type'
          value={processLabel}
        />
        <InfoCard
          icon={FileText}
          label='Job Number'
          value={siteDetails?.job_number.toUpperCase() ?? "N/A"}
        />
        <InfoCard
          icon={FileText}
          label='Joint Estimate No.'
          value={siteDetails?.joint_estimate_number.toUpperCase() ?? "N/A"}
        />
        <InfoCard
          icon={MapPin}
          label='Area'
          value={capitalFirstLetter(siteDetails?.area ?? "N/A")}
        />
        <InfoCard
          icon={Building2}
          label='Installation'
          value={capitalFirstLetter(siteDetails?.installation_type ?? "N/A")}
        />
        <InfoCard
          icon={User}
          label='Land Owner'
          value={capitalFirstLetter(siteDetails?.land_owner_name ?? "N/A")}
        />
        <InfoCard
          icon={Calendar}
          label='Start Date'
          value={
            siteDetails?.date
              ? format(new Date(siteDetails.date), "dd MMM yyyy")
              : "N/A"
          }
        />
        <InfoCard
          icon={Calendar}
          label='End Date'
          value={
            siteDetails?.end_date
              ? format(new Date(siteDetails.end_date), "dd MMM yyyy")
              : "N/A"
          }
        />
      </div>

      <div className='mt-4 pt-3 border-t border-gray-200/50'>
        <div className='flex items-start gap-2.5'>
          <MapPin className='w-3.5 h-3.5 text-gray-400 mt-0.5' />
          <div>
            <p className='text-[10px] text-gray-400 uppercase tracking-wide'>
              Address
            </p>
            <p className='text-xs text-gray-700'>
              {siteDetails?.site?.address ?? "N/A"},{" "}
              {siteDetails?.site?.city ?? "N/A"},{" "}
              {siteDetails?.site?.state ?? "N/A"}
            </p>
          </div>
        </div>
      </div>

      {siteDetails?.remarks && (
        <div className='mt-3 pt-3 border-t border-gray-200/50'>
          <p className='text-[10px] text-gray-400 uppercase tracking-wide mb-1'>
            Remarks
          </p>
          <p className='text-xs text-gray-600'>
            {capitalFirstLetter(siteDetails.remarks)}
          </p>
        </div>
      )}

      <div className='mt-4 pt-4 border-t border-gray-200/50'>
        <div className='flex items-center gap-2 mb-3'>
          <FileText className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Measurement Sheet
          </span>
        </div>

        <DeferredFilePicker
          label='Select Measurement Sheets'
          selectedFile={null}
          onFileSelect={handleMeasurementSheetFileSelect}
          multiple={true}
          isUploadBgWhite={true}
          helperText='You can select multiple files'
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
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2'>
                {measurementSheetDocs.map((doc: any, index: number) => (
                  <div
                    key={doc.id}
                    className='relative group flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-100 hover:border-emerald-200 hover:shadow-xs transition-all duration-200 overflow-hidden'>
                    {/* <div className='shrink-0 size-7 flex items-center justify-center bg-emerald-50 rounded-md group-hover:bg-emerald-100 transition-colors'>
                      <File className='size-3.5 text-emerald-600' />
                    </div> */}

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
    </div>
  );
};

export default SiteDetailsCard;

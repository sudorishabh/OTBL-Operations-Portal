"use client";

import CustomButton from "@/components/shared/btn";
import DeferredFilePicker from "@/components/shared/deferred-file-picker";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { format } from "date-fns";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileText,
  LogOut,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";

type PendingItem = { file: File; description: string };

type OperatorUploadRow =
  RouterOutputs["workOrderSiteQuery"]["getOperatorUploads"][number];

export default function WoSiteOperatorUploadPage() {
  const params = useParams();
  const workOrderSiteId = Number(params.workOrderSiteId);
  const { logout } = useAuthContext();

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: siteDetails, isLoading } =
    trpc.workOrderSiteQuery.getWorkOrderSiteDetails.useQuery(
      { work_order_site_id: workOrderSiteId },
      { enabled: Number.isFinite(workOrderSiteId) && workOrderSiteId > 0 },
    );

  const { data: operatorUploads = [] } =
    trpc.workOrderSiteQuery.getOperatorUploads.useQuery(
      { work_order_site_id: workOrderSiteId },
      { enabled: Number.isFinite(workOrderSiteId) && workOrderSiteId > 0 },
    );

  const operatorUpload = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${workOrderSiteId}/OperatorUploads`,
  });

  const createOperatorUploadMutation =
    trpc.workOrderSiteMutation.createOperatorUpload.useMutation({
      onSuccess: () => {
        void utils.workOrderSiteQuery.getOperatorUploads.invalidate();
        void utils.workOrderSiteQuery.getWorkOrderSiteDetails.invalidate();
        toast.success("Document saved");
      },
    });

  const deleteOperatorUploadMutation =
    trpc.workOrderSiteMutation.deleteOperatorUpload.useMutation({
      onSuccess: () => {
        void utils.workOrderSiteQuery.getOperatorUploads.invalidate();
        toast.success("Document deleted");
      },
    });

  const handleFileSelect = useCallback((file: File | null) => {
    if (file) {
      setPendingItems((prev) => [...prev, { file, description: "" }]);
    }
  }, []);

  const handleRemovePending = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePendingDescription = (index: number, description: string) => {
    setPendingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, description } : item)),
    );
  };

  const handleUploadAll = async () => {
    if (pendingItems.length === 0 || !workOrderSiteId) return;

    const missing = pendingItems.findIndex((p) => !p.description.trim());
    if (missing !== -1) {
      toast.error("Add a description for each file before uploading.");
      return;
    }

    setIsUploadingAll(true);
    try {
      for (const { file, description } of pendingItems) {
        const result = await operatorUpload.uploadFile(file);
        if (result) {
          await createOperatorUploadMutation.mutateAsync({
            work_order_site_id: workOrderSiteId,
            description: description.trim(),
            document_url: result.webUrl,
            document_id: result.id,
            file_name: file.name,
          });
        }
      }
      setPendingItems([]);
      operatorUpload.reset();
      toast.success("All files uploaded successfully");
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploadingAll(false);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteOperatorUploadMutation.mutate({ id });
    }
  };

  if (!Number.isFinite(workOrderSiteId) || workOrderSiteId <= 0) {
    return (
      <p className='p-6 text-sm text-muted-foreground'>
        Invalid work order site.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className='mx-auto w-full max-w-4xl p-6'>
        <div className='h-6 w-64 rounded-md bg-muted animate-pulse' />
        <div className='mt-2 h-4 w-80 rounded-md bg-muted/70 animate-pulse' />
        <div className='mt-6 rounded-xl border bg-card p-5'>
          <div className='h-4 w-40 rounded-md bg-muted animate-pulse' />
          <div className='mt-3 h-10 w-full rounded-md bg-muted/70 animate-pulse' />
          <div className='mt-3 h-24 w-full rounded-md bg-muted/70 animate-pulse' />
        </div>
      </div>
    );
  }

  if (!siteDetails) {
    return (
      <div className='p-6 space-y-4'>
        <p className='text-sm text-muted-foreground'>
          Work order site not found or you do not have access.
        </p>
        <CustomButton
          type='button'
          variant='outline'
          text='Log out'
          Icon={LogOut}
          onClick={() => void logout()}
        />
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-4xl p-4 sm:p-6 space-y-6'>
      <div className='sticky top-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 border-b'>
        <Link
          href='/dashboard/wo-site'
          className='inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-2'>
          <ArrowLeft className='size-3' />
          My sites
        </Link>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Work order site
            </p>
            <h1 className='text-lg sm:text-xl font-semibold text-foreground truncate'>
              {siteDetails.work_order?.code ?? "—"}{" "}
              <span className='text-muted-foreground font-medium'>·</span>{" "}
              {siteDetails.site?.name ?? "—"}
            </h1>
            <p className='text-sm text-muted-foreground mt-1'>
              {siteDetails.work_order?.title ?? "Documents"} · Job{" "}
              <span className='font-medium text-foreground/80'>
                {siteDetails.work_order?.job_number ?? "—"}
              </span>
            </p>
          </div>

          <div className='flex items-center gap-2'>
            <Badge
              variant='secondary'
              className='text-[11px]'>
              Uploaded: {operatorUploads.length}
            </Badge>
            <CustomButton
              type='button'
              variant='outline'
              text='Log out'
              Icon={LogOut}
              onClick={() => void logout()}
            />
          </div>
        </div>
      </div>

      <div className='rounded-xl border bg-card p-5 shadow-sm'>
        <div className='flex items-start justify-between gap-3 mb-3'>
          <div className='flex items-center gap-2'>
            <div className='grid place-items-center size-8 rounded-lg border bg-background'>
              <FileText className='w-4 h-4 text-emerald-600' />
            </div>
            <div>
              <p className='text-sm font-semibold text-foreground'>
                Site documents
              </p>
              <p className='text-[11px] text-muted-foreground'>
                Stored in SharePoint. Add a short description for each file.
              </p>
            </div>
          </div>
          {pendingItems.length > 0 && (
            <Badge
              variant='outline'
              className='text-[11px]'>
              Pending: {pendingItems.length}
            </Badge>
          )}
        </div>

        <div className='rounded-lg border bg-muted/20 p-3'>
          <div className='flex flex-col sm:flex-row gap-2 items-stretch'>
            <div className='flex-1'>
              <DeferredFilePicker
                label='Select files'
                selectedFile={null}
                onFileSelect={handleFileSelect}
                multiple={true}
                isUploadBgWhite={true}
                helperText='You can select multiple files'
              />
            </div>

            <input
              ref={cameraInputRef}
              type='file'
              accept='image/*'
              capture='environment'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
            />

            <button
              type='button'
              onClick={() => cameraInputRef.current?.click()}
              title='Take a photo'
              className='shrink-0 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-md border border-dashed bg-background text-sm text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-colors'>
              <Camera className='w-4 h-4' />
              <span className='sm:inline hidden'>Take photo</span>
              <span className='sm:hidden'>Camera</span>
            </button>
          </div>

          {(operatorUpload.isUploading || isUploadingAll) && (
            <div className='mt-3'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-[11px] text-muted-foreground'>
                  Uploading to SharePoint…
                </p>
                <p className='text-[11px] font-medium text-foreground/80 tabular-nums'>
                  {Math.round(operatorUpload.progress ?? 0)}%
                </p>
              </div>
              <Progress
                value={operatorUpload.progress}
                className='h-1.5 mt-2'
                indicatorClassName='bg-emerald-500'
              />
            </div>
          )}
        </div>

        {pendingItems.length > 0 && (
          <div className='mt-3 space-y-2'>
            <div className='flex items-center justify-between px-1'>
              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-bold text-amber-600 uppercase tracking-widest'>
                  Pending upload
                </span>
                <Badge
                  variant='outline'
                  className='text-[9px] px-1.5 py-0 h-4 bg-amber-50/60 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40'>
                  {pendingItems.length}
                </Badge>
              </div>
              <button
                type='button'
                onClick={() => setPendingItems([])}
                className='text-[10px] text-red-500 hover:text-red-600 font-medium transition-colors'>
                Clear all
              </button>
            </div>
            <div className='space-y-3'>
              {pendingItems.map((item, idx) => (
                <div
                  key={`${item.file.name}-${idx}`}
                  className='rounded-lg border border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900/40 p-3 space-y-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <FileText className='w-3 h-3 text-amber-500 shrink-0' />
                      <span className='text-[11px] text-foreground truncate font-medium'>
                        {item.file.name}
                      </span>
                    </div>
                    <button
                      type='button'
                      onClick={() => handleRemovePending(idx)}
                      className='p-1 text-amber-500/70 hover:text-red-500 shrink-0 transition-colors'>
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                  <Textarea
                    placeholder='Description (required)'
                    value={item.description}
                    onChange={(e) =>
                      handlePendingDescription(idx, e.target.value)
                    }
                    className='min-h-[72px] text-xs bg-background'
                  />
                </div>
              ))}
            </div>
            <CustomButton
              onClick={() => void handleUploadAll()}
              disabled={isUploadingAll || operatorUpload.isUploading}
              variant='primary'
              Icon={Upload}
              text={isUploadingAll ? "Uploading…" : "Upload all"}
              loading={isUploadingAll}
              className='w-full mt-2 h-9 text-xs'
            />
          </div>
        )}

        <div className='mt-6 pt-4 border-t'>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest'>
              Uploaded
            </span>
            {operatorUploads.length > 0 && (
              <span className='text-[11px] text-muted-foreground'>
                Tap a file name to open in SharePoint
              </span>
            )}
          </div>

          {operatorUploads.length === 0 ? (
            <div className='mt-3 rounded-lg border bg-muted/30 p-4'>
              <p className='text-sm font-medium text-foreground'>
                No documents uploaded yet
              </p>
              <p className='text-[11px] text-muted-foreground mt-1'>
                Select files above (or take a photo) and upload them with a
                short description.
              </p>
            </div>
          ) : (
            <ScrollArea
              className={operatorUploads.length > 4 ? "h-44 mt-2" : "mt-2"}>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 pr-3'>
                {operatorUploads.map((doc: OperatorUploadRow) => (
                  <div
                    key={doc.id}
                    className='group flex flex-col gap-1.5 p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors'>
                    <div className='min-w-0 flex-1'>
                      <a
                        href={doc.document_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-sm font-medium flex items-center text-foreground truncate hover:text-emerald-600'>
                        {doc.file_name ?? `Document ${doc.id}`}
                        <ExternalLink className='inline size-4 ml-1 opacity-50 shrink-0' />
                      </a>
                      <p className='text-[11px] text-muted-foreground mt-1 line-clamp-3'>
                        {doc.description}
                      </p>
                      <p className='text-[10px] text-muted-foreground mt-2'>
                        <span className='font-medium text-foreground/80'>
                          {doc.uploaded_by_name}
                        </span>{" "}
                        {doc.created_at && (
                          <>
                            <span className='mx-1'>·</span>
                            {format(new Date(doc.created_at), "dd MMM yy")}
                          </>
                        )}
                      </p>
                    </div>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type='button'
                            className='self-end p-1 text-muted-foreground/70 hover:text-red-500 transition-colors disabled:opacity-50'
                            onClick={() => void handleDeleteDocument(doc.id)}
                            disabled={deleteOperatorUploadMutation.isPending}>
                            <Trash2 className='w-4 h-4' />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side='top'
                          className='text-[10px]'>
                          Delete
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}

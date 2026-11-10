"use client";

import CustomButton from "@/components/shared/btn";
import DeferredFilePicker, {
  getFileTypeStyle,
} from "@/components/shared/deferred-file-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  STATUS_STYLES,
  formatDateRange,
  scheduleNote,
  statusOf,
  workLocation,
} from "@/lib/wo-site-display";
import { capitalFirstLetter, constants } from "@pkg/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileText,
  Loader2,
  LogOut,
  MapPin,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonRegion, TextLine } from "@/components/skeleton/parts";

const { MAX_DOCUMENTS, PHOTO_EXTENSIONS } = constants;

type PendingItem = { file: File; description: string };

type OperatorUploadRow =
  RouterOutputs["workOrderSiteQuery"]["getOperatorUploads"][number];

const LABEL = "text-[11.5px] font-semibold uppercase tracking-[0.08em] text-gray-400";

const Section = ({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className='overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm'>
    <header className='flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3'>
      <div className='min-w-0'>
        <h2 className='text-[14px] font-semibold tracking-tight text-gray-900'>
          {title}
        </h2>
        {description && (
          <p className='mt-0.5 text-[12.5px] text-gray-500'>{description}</p>
        )}
      </div>
      {action}
    </header>
    <div className='p-4'>{children}</div>
  </section>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className='min-w-0'>
    <div className={LABEL}>{label}</div>
    <div className='mt-0.5 text-[13.5px] font-medium text-gray-700'>
      {children}
    </div>
  </div>
);

export default function WoSiteOperatorUploadPage() {
  const params = useParams();
  const workOrderSiteId = Number(params.workOrderSiteId);
  const { logout } = useAuthContext();

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  // The pending file being uploaded, while "Upload" works through them.
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [docToDelete, setDocToDelete] = useState<OperatorUploadRow | null>(
    null,
  );
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

    try {
      for (const [index, { file, description }] of pendingItems.entries()) {
        setUploadingIndex(index);
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
      setUploadingIndex(null);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className='min-h-svh bg-gray-100'>
      <header className='bg-cyan-900 px-4 py-3 sm:px-6'>
        <div className='mx-auto flex max-w-3xl items-center justify-between gap-3'>
          <Link
            href='/dashboard/wo-site'
            className='inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[13px] font-medium text-cyan-50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'>
            <ArrowLeft className='size-4' />
            My sites
          </Link>

          <button
            type='button'
            onClick={() => void logout()}
            className='inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/20 px-2.5 text-[13px] font-medium text-cyan-50 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'>
            <LogOut className='size-3.5' />
            <span className='hidden sm:inline'>Log out</span>
          </button>
        </div>
      </header>

      <main className='mx-auto w-full max-w-3xl space-y-3 px-4 py-4 sm:px-6'>
        {children}
      </main>
    </div>
  );

  if (!Number.isFinite(workOrderSiteId) || workOrderSiteId <= 0) {
    return shell(
      <div className='rounded-xl border border-gray-200 bg-white px-6 py-12 text-center'>
        <p className='text-[14px] font-semibold text-gray-900'>
          That site link is not valid
        </p>
        <p className='mt-1 text-[13px] text-gray-500'>
          Go back to your sites and open one from the list.
        </p>
      </div>,
    );
  }

  if (isLoading) {
    // The site card line for line, then the two document sections, whose
    // headings never change.
    const fields = (widths: string[]) =>
      widths.map((width) => (
        <div key={width}>
          <TextLine
            line='h-[17px]'
            className='h-2.5 w-16'
          />
          <TextLine
            line='mt-0.5 h-5'
            className={`h-3.5 ${width}`}
          />
        </div>
      ));
    return shell(
      <SkeletonRegion
        label='Loading the site'
        className='space-y-3'>
        <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
          <div className='flex h-6 items-center justify-between gap-2'>
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-5 w-16 rounded-full' />
          </div>
          <TextLine
            line='mt-1 h-[19px]'
            className='w-44'
          />
          <TextLine
            line='mt-1.5 h-[19.5px]'
            className='w-2/3'
          />
          <div className='mt-3 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 sm:grid-cols-2'>
            {fields(["w-64", "w-36"])}
          </div>
          <div className='mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 sm:grid-cols-3'>
            {fields(["w-32", "w-24", "w-20"])}
          </div>
        </section>
        <Section
          title='Add documents'
          description='Measurement sheets, bills and other PDFs, or photos from the camera.'>
          <Skeleton className='h-9 w-full rounded-lg' />
        </Section>
        <Section
          title='Uploaded documents'
          action={<Skeleton className='h-5 w-7 rounded-full' />}>
          <Skeleton className='h-36 w-full rounded-lg bg-gray-100' />
        </Section>
      </SkeletonRegion>,
    );
  }

  if (!siteDetails) {
    return shell(
      <div className='rounded-xl border border-gray-200 bg-white px-6 py-12 text-center'>
        <p className='text-[14px] font-semibold text-gray-900'>
          This site is not available to you
        </p>
        <p className='mt-1 text-[13px] text-gray-500'>
          It may have been reassigned. Go back to your sites, or log out and
          sign in again.
        </p>
      </div>,
    );
  }

  const site = siteDetails.site;
  const workOrder = siteDetails.work_order;
  const note = scheduleNote(
    siteDetails.status,
    siteDetails.date,
    siteDetails.end_date,
  );
  const address = workLocation(
    siteDetails.process_type,
    [site?.address, site?.city, site?.state].filter(Boolean).join(", "),
  );
  const extras = [
    workOrder?.area ? { label: "Area", value: workOrder.area } : null,
    siteDetails.process_type
      ? { label: "Process", value: siteDetails.process_type }
      : null,
    workOrder?.installation_type
      ? { label: "Installation", value: workOrder.installation_type }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const isBusy = uploadingIndex !== null || operatorUpload.isUploading;
  const hasPending = pendingItems.length > 0;
  // One bar across all the pending files, as each reports its own progress.
  const overallProgress = hasPending
    ? Math.min(
        100,
        Math.round(
          ((uploadingIndex ?? 0) * 100 + (operatorUpload.progress ?? 0)) /
            pendingItems.length,
        ),
      )
    : 0;

  return shell(
    <>
      <section className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm'>
        <div className='flex items-start justify-between gap-2'>
          <h1
            className='min-w-0 flex-1 truncate text-[16px] font-semibold tracking-tight text-gray-900'
            title={site?.name ?? undefined}>
            {site?.name?.toUpperCase() ?? "—"}
          </h1>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold",
              STATUS_STYLES[statusOf(siteDetails.status)],
            )}>
            {capitalFirstLetter(siteDetails.status ?? "pending")}
          </span>
        </div>

        <div className='mt-1 flex items-center gap-2 text-[12.5px] text-gray-500'>
          <span className='truncate font-medium tabular-nums'>
            {workOrder?.code ?? "—"}
          </span>
          <span
            aria-hidden
            className='h-3 w-px shrink-0 bg-gray-200'
          />
          <span className='shrink-0 tabular-nums'>
            Job {workOrder?.job_number ?? "—"}
          </span>
        </div>

        {workOrder?.title && (
          <p
            className='mt-1.5 truncate text-[13px] text-gray-400'
            title={workOrder.title}>
            {workOrder.title}
          </p>
        )}

        <dl className='mt-3 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 sm:grid-cols-2'>
          <Field label='Location'>
            <span
              className='flex items-start gap-1'
              title={address}>
              <MapPin className='mt-0.5 size-3.5 shrink-0 text-gray-400' />
              <span>
                {address}
                {site?.pincode && (
                  <span className='text-gray-400'> {site.pincode}</span>
                )}
              </span>
            </span>
          </Field>

          <Field label='Schedule'>
            <span className='tabular-nums'>
              {formatDateRange(siteDetails.date, siteDetails.end_date)}
            </span>
            {note && (
              <span className={cn("block text-[12.5px]", note.tone)}>
                {note.text}
              </span>
            )}
          </Field>
        </dl>

        {extras.length > 0 && (
          <dl className='mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-3 sm:grid-cols-3'>
            {extras.map((extra) => (
              <Field
                key={extra.label}
                label={extra.label}>
                <span className='block truncate'>
                  {capitalFirstLetter(extra.value)}
                </span>
              </Field>
            ))}
          </dl>
        )}
      </section>

      <Section
        title='Add documents'
        description='Measurement sheets, bills and other PDFs, or photos from the camera.'>
        {/* The files waiting to upload, each with its description, then a row
            to add more and the upload button, in one box. */}
        <div
          className={cn(
            "divide-y divide-gray-100 overflow-hidden rounded-lg border",
            hasPending ? "border-gray-200" : "border-dashed border-gray-300",
          )}>
          {hasPending && (
            <ul className='divide-y divide-gray-100'>
              {pendingItems.map((item, idx) => {
                const { Icon, bg, text } = getFileTypeStyle(item.file.name);

                return (
                  <li
                    key={`${item.file.name}-${idx}`}
                    className='px-3 py-2'>
                    <div className='flex items-center gap-2'>
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded",
                          bg,
                        )}>
                        {uploadingIndex === idx ? (
                          <Loader2 className='size-3.5 animate-spin text-emerald-600' />
                        ) : (
                          <Icon className={cn("size-3.5", text)} />
                        )}
                      </span>
                      <span
                        className='min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800'
                        title={item.file.name}>
                        {item.file.name}
                      </span>
                      {!isBusy && (
                        <button
                          type='button'
                          onClick={() => handleRemovePending(idx)}
                          aria-label={`Remove ${item.file.name}`}
                          title={`Remove ${item.file.name}`}
                          className='flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600'>
                          <X className='size-3.5' />
                        </button>
                      )}
                    </div>
                    {/* One line that grows with what is typed, under the
                        name. */}
                    <div className='mt-1.5 pl-8'>
                      <Textarea
                        rows={1}
                        placeholder='What is this file? (required)'
                        aria-label={`What ${item.file.name} is`}
                        value={item.description}
                        onChange={(e) =>
                          handlePendingDescription(idx, e.target.value)
                        }
                        disabled={isBusy}
                        className='min-h-8 resize-none bg-white px-2.5 py-1.5 leading-5 shadow-none sm:text-[13px]'
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Hidden while uploading, as the list clears when it is done. */}
          {!isBusy && (
            <div className='flex'>
              <div className='min-w-0 flex-1'>
                <DeferredFilePicker
                  label={hasPending ? "Add files" : "Select files"}
                  selectedFile={null}
                  onFileSelect={handleFileSelect}
                  multiple
                  fileCount={pendingItems.length}
                  variant='row'
                />
              </div>

              <input
                ref={cameraInputRef}
                type='file'
                accept={PHOTO_EXTENSIONS.join(",")}
                capture='environment'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  const isPhoto =
                    !!file &&
                    PHOTO_EXTENSIONS.some((ext) =>
                      file.name.toLowerCase().endsWith(ext),
                    );
                  if (file && !isPhoto) {
                    toast.error("Photos must be JPG or PNG");
                  } else if (file) {
                    handleFileSelect(file);
                  }
                  e.target.value = "";
                }}
              />

              <button
                type='button'
                onClick={() => cameraInputRef.current?.click()}
                disabled={pendingItems.length >= MAX_DOCUMENTS}
                title={
                  pendingItems.length >= MAX_DOCUMENTS
                    ? `You can add up to ${MAX_DOCUMENTS} files at a time`
                    : "Use the camera on this device"
                }
                className='group flex h-9 shrink-0 cursor-pointer items-center gap-1.5 border-l border-gray-200 bg-gray-50/60 px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50'>
                <Camera className='size-3.5 text-gray-400 transition-colors group-hover:text-emerald-600' />
                Take a photo
              </button>
            </div>
          )}

          {hasPending && (
            <div className='flex h-11 items-center gap-3 px-3'>
              {isBusy ? (
                <>
                  <span className='shrink-0 text-xs font-medium text-gray-700'>
                    Uploading {(uploadingIndex ?? 0) + 1} of{" "}
                    {pendingItems.length}
                  </span>
                  <Progress
                    value={overallProgress}
                    className='h-1 flex-1'
                    indicatorClassName='bg-emerald-500'
                  />
                  <span className='w-8 shrink-0 text-right text-xs tabular-nums text-gray-500'>
                    {overallProgress}%
                  </span>
                </>
              ) : (
                <>
                  <button
                    type='button'
                    onClick={() => setPendingItems([])}
                    className='cursor-pointer text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:text-rose-600 hover:underline'>
                    Clear all
                  </button>
                  <CustomButton
                    onClick={() => void handleUploadAll()}
                    variant='primary'
                    Icon={Upload}
                    text={`Upload ${pendingItems.length} ${pendingItems.length === 1 ? "file" : "files"}`}
                    className='ml-auto'
                  />
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      <Section
        title='Uploaded documents'
        description={
          operatorUploads.length > 0
            ? "Tap a file name to open it in SharePoint."
            : undefined
        }
        action={
          <span className='shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-gray-600'>
            {operatorUploads.length}
          </span>
        }>
        {operatorUploads.length === 0 ? (
          <div className='rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center'>
            <FileText className='mx-auto size-6 text-gray-300' />
            <p className='mt-2.5 text-[13.5px] font-semibold text-gray-900'>
              Nothing uploaded yet
            </p>
            <p className='mt-1 text-[12.5px] text-gray-500'>
              Select files above, or take a photo, then upload them with a
              short description.
            </p>
          </div>
        ) : (
          <ul className='divide-y divide-gray-100'>
            {operatorUploads.map((doc: OperatorUploadRow) => (
              <li
                key={doc.id}
                className='flex items-start gap-3 py-3 first:pt-0 last:pb-0'>
                <div className='min-w-0 flex-1'>
                  <a
                    href={doc.document_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex max-w-full items-center gap-1 text-[13.5px] font-medium text-gray-900 transition-colors hover:text-emerald-700'>
                    <span className='truncate'>
                      {doc.file_name ?? `Document ${doc.id}`}
                    </span>
                    <ExternalLink className='size-3.5 shrink-0 text-gray-400' />
                  </a>

                  {doc.description && (
                    <p className='mt-0.5 line-clamp-2 text-[12.5px] text-gray-500'>
                      {doc.description}
                    </p>
                  )}

                  <p className='mt-1 text-[12px] text-gray-400'>
                    <span className='font-medium text-gray-500'>
                      {doc.uploaded_by_name}
                    </span>
                    {doc.created_at && (
                      <span className='tabular-nums'>
                        {" · "}
                        {format(new Date(doc.created_at), "d MMM yy")}
                      </span>
                    )}
                  </p>
                </div>

                <button
                  type='button'
                  onClick={() => setDocToDelete(doc)}
                  disabled={deleteOperatorUploadMutation.isPending}
                  aria-label={`Delete ${doc.file_name ?? `document ${doc.id}`}`}
                  className='shrink-0 cursor-pointer rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50'>
                  <Trash2 className='size-4' />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <AlertDialog
        open={docToDelete !== null}
        onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {docToDelete?.file_name ?? "This document"} will be removed from
              the site record. You can upload it again afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 text-white hover:bg-rose-700'
              onClick={() => {
                if (docToDelete) {
                  deleteOperatorUploadMutation.mutate({ id: docToDelete.id });
                }
                setDocToDelete(null);
              }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
  );
}

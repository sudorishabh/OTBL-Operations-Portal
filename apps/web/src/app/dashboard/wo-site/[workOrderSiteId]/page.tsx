"use client";

import CustomButton from "@/components/shared/btn";
import DeferredFilePicker from "@/components/shared/deferred-file-picker";
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
} from "@/lib/wo-site-display";
import { capitalFirstLetter } from "@pkg/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  Camera,
  ExternalLink,
  FileText,
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
  const [isUploadingAll, setIsUploadingAll] = useState(false);
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
    return shell(
      <div className='animate-pulse space-y-3'>
        <div className='rounded-xl border border-gray-200 bg-white p-4'>
          <div className='h-4 w-1/2 rounded bg-gray-200' />
          <div className='mt-2 h-3 w-32 rounded bg-gray-100' />
          <div className='mt-3.5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3.5'>
            <div className='h-9 rounded bg-gray-100' />
            <div className='h-9 rounded bg-gray-100' />
          </div>
        </div>
        <div className='h-36 rounded-xl border border-gray-200 bg-white' />
        <div className='h-44 rounded-xl border border-gray-200 bg-white' />
      </div>,
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
  const address =
    [site?.address, site?.city, site?.state].filter(Boolean).join(", ") ||
    "Location not set";
  const extras = [
    workOrder?.area ? { label: "Area", value: workOrder.area } : null,
    siteDetails.process_type
      ? { label: "Process", value: siteDetails.process_type }
      : null,
    workOrder?.installation_type
      ? { label: "Installation", value: workOrder.installation_type }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const isBusy = isUploadingAll || operatorUpload.isUploading;

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
        description='Measurement sheets, bills and site photos. Files are stored in SharePoint.'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-stretch'>
          <div className='flex-1'>
            <DeferredFilePicker
              label='Select files'
              selectedFile={null}
              onFileSelect={handleFileSelect}
              multiple={true}
              isUploadBgWhite={true}
              helperText='You can select more than one file'
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
            className='inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 text-[13px] font-medium text-gray-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
            <Camera className='size-4' />
            Take a photo
          </button>
        </div>

        {isBusy && (
          <div className='mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3'>
            <div className='flex items-center justify-between gap-3'>
              <p className='text-[12.5px] font-medium text-gray-700'>
                Uploading to SharePoint…
              </p>
              <p className='text-[12.5px] font-semibold tabular-nums text-gray-700'>
                {Math.round(operatorUpload.progress ?? 0)}%
              </p>
            </div>
            <Progress
              value={operatorUpload.progress}
              className='mt-2 h-1.5'
              indicatorClassName='bg-emerald-500'
            />
          </div>
        )}

        {pendingItems.length > 0 && (
          <div className='mt-4 border-t border-gray-100 pt-4'>
            <div className='flex items-center justify-between gap-3'>
              <p className='text-[13px] font-semibold text-gray-900'>
                Ready to upload
                <span className='ml-1.5 font-medium tabular-nums text-gray-500'>
                  {pendingItems.length}
                </span>
              </p>
              <button
                type='button'
                onClick={() => setPendingItems([])}
                className='cursor-pointer text-[12.5px] font-medium text-gray-500 underline-offset-2 transition-colors hover:text-rose-600 hover:underline'>
                Clear all
              </button>
            </div>

            <p className='mt-1 text-[12.5px] text-gray-500'>
              Describe each file so the office knows what it is.
            </p>

            <div className='mt-3 space-y-2.5'>
              {pendingItems.map((item, idx) => (
                <div
                  key={`${item.file.name}-${idx}`}
                  className='rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-1.5'>
                      <FileText className='size-3.5 shrink-0 text-gray-400' />
                      <span
                        className='truncate text-[13px] font-medium text-gray-800'
                        title={item.file.name}>
                        {item.file.name}
                      </span>
                    </div>
                    <button
                      type='button'
                      onClick={() => handleRemovePending(idx)}
                      aria-label={`Remove ${item.file.name}`}
                      className='shrink-0 cursor-pointer rounded p-1 text-gray-400 transition-colors hover:bg-white hover:text-rose-600'>
                      <X className='size-3.5' />
                    </button>
                  </div>
                  <Textarea
                    placeholder='What is this file? (required)'
                    value={item.description}
                    onChange={(e) =>
                      handlePendingDescription(idx, e.target.value)
                    }
                    className='mt-2 min-h-16 bg-white text-[13px]'
                  />
                </div>
              ))}
            </div>

            <CustomButton
              onClick={() => void handleUploadAll()}
              disabled={isBusy}
              variant='primary'
              Icon={Upload}
              text={
                isUploadingAll
                  ? "Uploading…"
                  : `Upload ${pendingItems.length} ${pendingItems.length === 1 ? "file" : "files"}`
              }
              loading={isUploadingAll}
              className='mt-3 h-9 w-full text-[13px]'
            />
          </div>
        )}
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

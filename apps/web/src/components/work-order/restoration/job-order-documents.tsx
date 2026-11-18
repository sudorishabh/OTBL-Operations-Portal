"use client";
import React, { useState } from "react";
import { Award, ReceiptIndianRupee, type LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { useIsViewer } from "@/contexts/AuthContext";
import {
  toDocuments,
  toStoredDocument,
  type StoredDocument,
} from "@/lib/documents";
import { cn } from "@/lib/utils";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import type { JobOrder } from "./job-order-dialog";
import { jobOrderPlace } from "./restoration-display";

// The kinds of document a job order keeps, each shown as its own badge and
// kept in its own folder.
const KINDS = {
  certificates: {
    Icon: Award,
    title: "Completion Certificates",
    one: "certificate",
    none: "No certificate",
    uploadLabel: "Upload completion certificates",
    saved: "Certificates saved",
    filledStyle:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
    folder: "",
    stored: (jobOrder: JobOrder) => jobOrder.documents,
    note: "Uploading a certificate closes the job order: its expenses can then no longer be added, changed or deleted. Removing every certificate reopens it.",
  },
  invoices: {
    Icon: ReceiptIndianRupee,
    title: "Invoices",
    one: "invoice",
    none: "No invoice",
    uploadLabel: "Upload invoices",
    saved: "Invoices saved",
    filledStyle: "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100",
    folder: "/Invoices",
    stored: (jobOrder: JobOrder) => jobOrder.invoices,
    note: null,
  },
} satisfies Record<
  string,
  {
    Icon: LucideIcon;
    title: string;
    one: string;
    none: string;
    uploadLabel: string;
    saved: string;
    filledStyle: string;
    folder: string;
    stored: (jobOrder: JobOrder) => unknown;
    // Shown above the upload, to those who can upload.
    note: string | null;
  }
>;

export type JobOrderDocumentKind = keyof typeof KINDS;

interface Props {
  restorationId: number;
  jobOrder: JobOrder;
  kind: JobOrderDocumentKind;
}

// One kind of a job order's documents, shown as a badge on its row that opens
// them for viewing or uploading.
const JobOrderDocuments = ({ restorationId, jobOrder, kind }: Props) => {
  const isViewer = useIsViewer();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);

  const {
    Icon,
    title,
    one,
    none,
    uploadLabel,
    saved,
    filledStyle,
    folder,
    stored,
    note,
  } = KINDS[kind];
  const documents = toDocuments(stored(jobOrder));

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Restoration/${restorationId}/JobOrders/${jobOrder.id}${folder}`,
    conflictBehavior: "rename",
  });

  const onSaved = {
    onSuccess: async () => {
      toast.success(saved);
      setOpen(false);
      await utils.jobOrderQuery.getJobOrders.invalidate({
        work_order_site_id: restorationId,
      });
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  };
  const saveCertificates =
    trpc.jobOrderMutation.setJobOrderCertificates.useMutation(onSaved);
  const saveInvoices =
    trpc.jobOrderMutation.setJobOrderInvoices.useMutation(onSaved);

  const save = async () => {
    const uploaded = files.length > 0 ? await uploadFiles(files) : [];
    if (!uploaded) return;
    const next = [...savedDocuments, ...uploaded.map(toStoredDocument)];
    if (kind === "invoices") {
      saveInvoices.mutate({ id: jobOrder.id, invoices: next });
    } else {
      saveCertificates.mutate({ id: jobOrder.id, documents: next });
    }
  };

  const isSaving =
    isUploading || saveCertificates.isPending || saveInvoices.isPending;

  return (
    <>
      <button
        type='button'
        title={title}
        onClick={() => {
          setFiles([]);
          setSavedDocuments(documents);
          resetUpload();
          setOpen(true);
        }}
        className={cn(
          "mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset transition-colors",
          documents.length > 0
            ? filledStyle
            : "bg-gray-50 text-gray-500 ring-gray-200 hover:bg-gray-100",
        )}>
        <Icon className='size-3' />
        {documents.length > 0
          ? `${documents.length} ${one}${documents.length !== 1 ? "s" : ""}`
          : none}
      </button>

      <DialogWindow
        title={`${jobOrder.jo_number} ${title}`}
        description={jobOrderPlace(jobOrder) || undefined}
        size='md'
        heightMode='auto'
        open={open}
        setOpen={(next) => {
          if (!next && !isSaving) setOpen(false);
        }}>
        <div className='space-y-4 py-2'>
          {note && !isViewer && (
            <p className='rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200'>
              {note}
            </p>
          )}
          <DocumentsField
            label={uploadLabel}
            files={isViewer ? [] : files}
            onFilesChange={setFiles}
            existing={savedDocuments}
            onRemoveExisting={
              isViewer
                ? undefined
                : (index) =>
                    setSavedDocuments((prev) =>
                      prev.filter((_, i) => i !== index),
                    )
            }
            isUploading={isUploading}
            progress={progress}
          />
          {!isViewer && (
            <div className='flex justify-end gap-2'>
              <CustomButton
                type='button'
                variant='outline'
                text='Cancel'
                disabled={isSaving}
                onClick={() => setOpen(false)}
              />
              <CustomButton
                type='button'
                variant='primary'
                text={`Save ${one}s`}
                loading={isSaving}
                disabled={isSaving}
                onClick={save}
              />
            </div>
          )}
        </div>
      </DialogWindow>
    </>
  );
};

export default JobOrderDocuments;

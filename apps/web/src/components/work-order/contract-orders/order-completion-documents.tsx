"use client";
import React, { useState } from "react";
import { FileCheck2 } from "lucide-react";
import toast from "react-hot-toast";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useApiError } from "@/hooks/useApiError";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { useIsViewer } from "@/contexts/AuthContext";
import {
  toDocuments,
  toStoredDocument,
  type StoredDocument,
} from "@/lib/documents";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import type { ContractOrder } from "./contract-orders-section";

interface Props {
  workOrderId: number;
  order: ContractOrder;
}

// An order's completion documents, as a badge on its row that opens them for
// viewing, or for uploading once the work is done.
const OrderCompletionDocuments = ({ workOrderId, order }: Props) => {
  const isViewer = useIsViewer();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);

  const documents = toDocuments(order.completion_documents);

  const { uploadFiles, isUploading, progress, reset } = useSharePointUpload({
    folderPath: `/WorkOrders/${workOrderId}/ContractOrders/Completion`,
    conflictBehavior: "rename",
  });

  const saveDocuments =
    trpc.contractOrderMutation.setCompletionDocuments.useMutation({
      onSuccess: async () => {
        toast.success("Completion documents saved");
        setOpen(false);
        await utils.contractOrderQuery.getContractOrders.invalidate({
          work_order_id: workOrderId,
        });
      },
      onError: (error: unknown) => handleError(error, { showToast: true }),
    });

  const save = async () => {
    const uploaded = files.length > 0 ? await uploadFiles(files) : [];
    if (!uploaded) return;
    saveDocuments.mutate({
      id: order.id,
      completion_documents: [
        ...savedDocuments,
        ...uploaded.map(toStoredDocument),
      ],
    });
  };

  const isSaving = isUploading || saveDocuments.isPending;

  return (
    <>
      <button
        type='button'
        title='Completion documents'
        onClick={() => {
          setFiles([]);
          setSavedDocuments(documents);
          reset();
          setOpen(true);
        }}
        className={cn(
          "mr-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset transition-colors",
          documents.length > 0
            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
            : "bg-gray-50 text-gray-500 ring-gray-200 hover:bg-gray-100",
        )}>
        <FileCheck2 className='size-3' />
        {documents.length > 0 ? "Completed" : "Not completed"}
      </button>

      <DialogWindow
        title={`${order.order_number} Completion Documents`}
        description='Uploaded once the order’s work is done'
        size='md'
        heightMode='auto'
        open={open}
        setOpen={(next) => {
          if (!next && !isSaving) setOpen(false);
        }}>
        <div className='space-y-4 py-2'>
          <DocumentsField
            label='Completion documents'
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
                text='Save documents'
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

export default OrderCompletionDocuments;

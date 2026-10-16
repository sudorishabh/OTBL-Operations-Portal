"use client";
import React, { useState } from "react";
import {
  FileText,
  FlaskConical,
  Loader2,
  Trash2,
  Truck,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import { toDocuments, toStoredDocument } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import DocumentsMenu from "@/components/shared/documents-menu";

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
    <div className='space-y-3'>
      <div>
        <div className='flex items-center gap-2'>
          <Truck className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Mobilization Documents
          </span>
        </div>
        <p className='mt-0.5 text-[10px] text-gray-400'>
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

// The sample taken at mobilization, before the first application. Its TPH is
// the baseline the monthly samples are measured against.
const ZeroDaySample = ({ woSiteId }: Props) => {
  const utils = trpc.useUtils();
  const [files, setFiles] = useState<File[]>([]);
  const [tphValue, setTphValue] = useState("");

  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery({
      work_order_site_id: woSiteId,
    });
  const sample = bioremediationDataQuery.data?.bioSamples.find(
    (item: any) => item.application_month === constants.ZERO_DAY_SAMPLE,
  );
  const sampleDocuments = toDocuments(sample?.documents);

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/Sites/${woSiteId}/BioSamples`,
    conflictBehavior: "rename",
  });

  const refreshSamples = () =>
    utils.workOrderSiteQuery.getBioremediationData.invalidate({
      work_order_site_id: woSiteId,
    });

  const createSample = trpc.workOrderSiteMutation.createBioSample.useMutation({
    onSuccess: () => {
      toast.success("Zero day sample saved");
      setFiles([]);
      setTphValue("");
      resetUpload();
      refreshSamples();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const deleteSample = trpc.workOrderSiteMutation.deleteBioSample.useMutation({
    onSuccess: () => {
      toast.success("Zero day sample deleted");
      refreshSamples();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const save = async () => {
    if (files.length === 0) {
      toast.error("Upload the zero day sample report first.");
      return;
    }
    if (!tphValue) {
      toast.error("Enter the TPH value.");
      return;
    }

    try {
      const uploaded = await uploadFiles(files);
      if (!uploaded) return;
      createSample.mutate({
        work_order_site_id: woSiteId,
        documents: uploaded.map(toStoredDocument),
        tph_value: tphValue.replace(",", "."),
        application_month: constants.ZERO_DAY_SAMPLE,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload the report.",
      );
    }
  };

  const isSaving = isUploading || createSample.isPending;

  return (
    <div className='space-y-3'>
      <div>
        <div className='flex items-center gap-2'>
          <FlaskConical className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Zero Day Bio Sample
          </span>
        </div>
        <p className='mt-0.5 text-[10px] text-gray-400'>
          Taken before the first application, as the site's baseline TPH.
        </p>
      </div>

      {bioremediationDataQuery.isLoading ? (
        <div className='flex justify-center py-4 text-slate-400'>
          <Loader2 className='size-5 animate-spin' />
        </div>
      ) : sample ? (
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs'>
          <div className='flex flex-wrap items-center gap-4'>
            <span className='inline-flex items-center rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 font-mono text-[10px] text-emerald-700'>
              TPH: {sample.tph_value}
            </span>
            <DocumentsMenu
              documents={sampleDocuments}
              align='start'>
              <button
                type='button'
                className='inline-flex cursor-pointer items-center gap-1.5 text-blue-600 transition-colors hover:text-blue-800 hover:underline'>
                <FileText className='size-3.5' />
                {sampleDocuments.length === 1
                  ? "View Doc"
                  : `${sampleDocuments.length} Docs`}
              </button>
            </DocumentsMenu>
            <span className='text-slate-500'>
              Added {format(new Date(sample.created_at), "dd MMM yyyy")}
            </span>
          </div>
          <Button
            variant='ghost'
            size='sm'
            disabled={deleteSample.isPending}
            onClick={() => {
              if (confirm("Delete the zero day sample?")) {
                deleteSample.mutate({ id: sample.id });
              }
            }}
            className='h-8 w-8 p-0 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500'>
            <Trash2 className='size-4' />
          </Button>
        </div>
      ) : (
        <>
          <DocumentsField
            label='Upload sample report'
            files={files}
            onFilesChange={setFiles}
            isUploading={isUploading}
            progress={progress}
            className='rounded-xl'
          />
          <div className='flex flex-wrap items-end justify-between gap-3'>
            <div className='w-full sm:w-48'>
              <label className='mb-1 block text-[10px] font-medium text-slate-600'>
                TPH Value
              </label>
              <Input
                inputMode='decimal'
                value={tphValue}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === "" || /^[0-9]*[.,]?[0-9]*$/.test(next)) {
                    setTphValue(next);
                  }
                }}
                placeholder='0.00'
                className='h-9 bg-white'
              />
            </div>
            <CustomButton
              variant='primary'
              Icon={FlaskConical}
              text='Save zero day sample'
              loading={isSaving}
              disabled={isSaving}
              onClick={save}
              disableForViewer
            />
          </div>
        </>
      )}
    </div>
  );
};

// What happens at a bioremediation site before the first application, shown
// in the site information card.
const SiteMobilization = ({ woSiteId }: Props) => (
  <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
    <MobilizationDocuments woSiteId={woSiteId} />
    <ZeroDaySample woSiteId={woSiteId} />
  </div>
);

export default SiteMobilization;

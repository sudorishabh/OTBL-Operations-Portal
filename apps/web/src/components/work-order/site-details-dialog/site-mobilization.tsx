"use client";
import React, { useState } from "react";
import { FileText, FlaskConical, Trash2, Truck, Upload } from "lucide-react";
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
import UploadSectionHeader from "@/components/shared/upload-section-header";
import DocumentsMenu from "@/components/shared/documents-menu";
import { SampleRowSkeleton } from "@/components/skeleton/work-order/site-skeletons";

const MOBILIZATION = "mobilization";

const { ZERO_DAY_SAMPLE } = constants;

// When a sample was taken, or failing that, added.
const sampleDate = (sample: {
  sampled_on?: string | null;
  created_at: string;
}) => new Date(sample.sampled_on ?? sample.created_at);

const formatTph = (value: number) =>
  value.toLocaleString("en-IN", { maximumFractionDigits: 2 });

interface Props {
  woSiteId: number;
}

// The certificate recording the team and equipment moving onto the site,
// before bioremediation starts.
export const MobilizationCertificate = ({ woSiteId }: Props) => {
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
      toast.success("Mobilization certificate uploaded");
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
    <div className='space-y-2'>
      <UploadSectionHeader
        Icon={Truck}
        title='Mobilization Certificate'
        description='Certifies the team and equipment have moved onto the site.'
      />

      <DocumentsField
        isLoading={documentsQuery.isLoading}
        label='Doc upload'
        files={files}
        onFilesChange={setFiles}
        existing={documents.map((doc, index) => ({
          url: doc.document_url,
          id: doc.document_id ?? null,
          name: `Mobilization certificate ${index + 1}`,
        }))}
        onRemoveExisting={(index) => {
          const doc = documents[index];
          if (doc && confirm("Delete this document?")) {
            deleteDocument.mutate({ id: doc.id });
          }
        }}
        isUploading={isUploading}
        progress={progress}
        action={
          files.length > 0 && (
            <CustomButton
              variant='primary'
              Icon={Upload}
              text='Upload certificate'
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

// The sample taken at mobilization, before the first application. Its TPH is
// the baseline the monthly samples are measured against.
export const ZeroDaySample = ({ woSiteId }: Props) => {
  const utils = trpc.useUtils();
  const [files, setFiles] = useState<File[]>([]);
  const [tphValue, setTphValue] = useState("");

  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery({
      work_order_site_id: woSiteId,
    });
  const samples: any[] = bioremediationDataQuery.data?.bioSamples ?? [];
  const sample = samples.find(
    (item) => item.application_month === ZERO_DAY_SAMPLE,
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
        application_month: ZERO_DAY_SAMPLE,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload the report.",
      );
    }
  };

  const isSaving = isUploading || createSample.isPending;

  return (
    <div className='space-y-2'>
      <UploadSectionHeader
        Icon={FlaskConical}
        title='0-Day Bio Sample Report'
        description="Taken before the first application, as the site's baseline TPH."
      />

      {bioremediationDataQuery.isLoading ? (
        <SampleRowSkeleton />
      ) : sample ? (
        <SavedSample
          tph={Number(sample.tph_value)}
          takenOn={sampleDate(sample)}
          isSampledOn={!!sample.sampled_on}
          documents={sampleDocuments}
          isDeleting={deleteSample.isPending}
          onDelete={() => {
            if (confirm("Delete the zero day sample?")) {
              deleteSample.mutate({ id: sample.id });
            }
          }}
        />
      ) : (
        <>
          <DocumentsField
            label='Doc upload'
            files={files}
            onFilesChange={setFiles}
            isUploading={isUploading}
            progress={progress}
          />
          {/* Once a report is picked: its TPH, then save both together. */}
          {files.length > 0 && (
            <div className='flex flex-wrap items-center gap-2'>
              <label className='flex items-center gap-2'>
                <span className='shrink-0 text-[11px] text-gray-500'>
                  Baseline TPH
                </span>
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
                  className='h-8 w-24 bg-white text-[13px] tabular-nums'
                />
              </label>
              <CustomButton
                variant='primary'
                Icon={FlaskConical}
                text='Save sample'
                loading={isSaving}
                disabled={isSaving}
                onClick={save}
                className='h-8 px-3 text-xs'
                disableForViewer
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

// The saved zero day sample: a record of the site's baseline TPH, when it
// was taken, and its report.
const SavedSample = ({
  tph,
  takenOn,
  isSampledOn,
  documents,
  isDeleting,
  onDelete,
}: {
  tph: number;
  takenOn: Date;
  isSampledOn: boolean;
  documents: ReturnType<typeof toDocuments>;
  isDeleting: boolean;
  onDelete: () => void;
}) => (
  <div className='flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3'>
    <span className='grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100'>
      <FlaskConical className='size-4' />
    </span>
    <div className='min-w-0 flex-1'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-gray-400'>
        Baseline TPH
      </p>
      <p className='flex flex-wrap items-baseline gap-x-2'>
        <span className='text-xl font-semibold leading-7 tabular-nums text-gray-900'>
          {formatTph(tph)}
        </span>
        <span className='text-xs text-gray-500'>
          {isSampledOn ? "Sampled" : "Added"} {format(takenOn, "d MMM yyyy")}
        </span>
      </p>
    </div>
    <div className='flex shrink-0 items-center gap-1'>
      {documents.length > 0 && (
        <DocumentsMenu
          documents={documents}
          align='end'>
          <button
            type='button'
            className='inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-xs transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'>
            <FileText className='size-3.5 text-gray-400' />
            {documents.length === 1
              ? "View report"
              : `${documents.length} reports`}
          </button>
        </DocumentsMenu>
      )}
      <Button
        variant='ghost'
        size='sm'
        disabled={isDeleting}
        onClick={onDelete}
        title='Delete zero day sample'
        aria-label='Delete zero day sample'
        className='size-8 p-0 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500'>
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  </div>
);

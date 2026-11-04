"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { CheckCircle2, FileDown } from "lucide-react";
import { jobOrderSchemas } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useIsViewer } from "@/contexts/AuthContext";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import JobOrderActivitiesTable, {
  toActivityEntries,
  toActivityRows,
  type JobOrderActivityEntries,
} from "./job-order-activities-table";
import type { JobOrder, JobOrderWorkOrder } from "./job-order-dialog";
import type { JobOrderFormContent } from "./job-order-form-pdf";
import { sorLeftByRow } from "./restoration-display";
import type { RestorationRate } from "./restoration-rates-table";
import useJobOrderFormDownload from "./use-job-order-form-download";

interface Props {
  restorationId: number;
  jobOrder: JobOrder;
  workOrder: JobOrderWorkOrder;
  // The work order's restoration schedule of rates.
  rates: RestorationRate[];
  open: boolean;
  onClose: () => void;
}

const fieldLabel = "mb-1 block text-xs font-medium text-gray-700";

const toDateInput = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "yyyy-MM-dd") : "";
const formatDate = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "dd MMM yyyy") : null;

// The work as done, until it is first saved, starts from the quantities the
// job order gave out.
const startingEntries = (jobOrder: JobOrder): JobOrderActivityEntries =>
  jobOrder.completion_activities != null
    ? toActivityEntries(jobOrder.completion_activities)
    : toActivityEntries(
        (jobOrder.activities ?? []).map((row) => ({
          ...row,
          completion_date: null,
        })),
      );

// Records the work a job order got done, for the client's work completion
// certificate, and downloads the certificate to print for signing.
const JobOrderCompletionDialog = ({
  restorationId,
  jobOrder,
  workOrder,
  rates,
  open,
  onClose,
}: Props) => {
  const isViewer = useIsViewer();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const [completedOn, setCompletedOn] = useState("");
  const [entries, setEntries] = useState<JobOrderActivityEntries>({});
  // The certificate as saved, ready to download.
  const [saved, setSaved] = useState<JobOrderFormContent | null>(null);
  const { download, isDownloading } = useJobOrderFormDownload(
    workOrder,
    "completion",
  );

  // Filled in once as the dialog opens, so the refetch after saving doesn't
  // undo what is shown.
  useEffect(() => {
    if (!open) return;
    setCompletedOn(toDateInput(jobOrder.completed_on));
    setEntries(startingEntries(jobOrder));
    setSaved(null);
  }, [open]);

  // The certificate uses up the schedule of rates as it reads now.
  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery(
    { work_order_site_id: restorationId },
    { enabled: open },
  );
  const sorLeft = sorLeftByRow(
    rates,
    (jobOrdersQuery.data ?? []) as JobOrder[],
    { jobOrderId: jobOrder.id, rows: toActivityRows(entries) },
  );

  const setCompletion = trpc.jobOrderMutation.setJobOrderCompletion.useMutation(
    {
      onError: (error: unknown) => handleError(error, { showToast: true }),
    },
  );

  // The certificate as the form reads now, saved or not.
  const certificate = (): JobOrderFormContent => ({
    ...jobOrder,
    completed_on: completedOn ? new Date(completedOn) : null,
    completion_activities: toActivityRows(entries),
  });

  const save = () => {
    const parsed = jobOrderSchemas.setJobOrderCompletionSchema.safeParse({
      id: jobOrder.id,
      completed_on: completedOn ? new Date(completedOn) : null,
      activities: toActivityRows(entries),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the work done");
      return;
    }

    const content = certificate();
    setCompletion.mutate(parsed.data, {
      onSuccess: async () => {
        setSaved(content);
        // The certificate may have completed the restoration, or reopened it.
        await Promise.all([
          utils.jobOrderQuery.getJobOrders.invalidate({
            work_order_site_id: restorationId,
          }),
          utils.restorationQuery.getRestoration.invalidate(),
          utils.workOrderQuery.getWorkOrderDetails.invalidate(),
        ]);
      },
    });
  };

  const isSaving = setCompletion.isPending;
  // The certificate prints these from the job order itself.
  const details = [
    { label: "Installation", value: jobOrder.installation_name },
    { label: "Location", value: jobOrder.location },
    { label: "Job order date", value: formatDate(jobOrder.start_date) },
    {
      label: "Mobilization",
      value: formatDate(jobOrder.mobilization_date) ?? "Not applicable",
    },
  ];
  const isMissingDetails = !jobOrder.installation_name || !jobOrder.location;

  return (
    <DialogWindow
      title={
        saved
          ? "Completion Saved"
          : `${jobOrder.jo_number} Work Completion Certificate`
      }
      description={saved ? undefined : jobOrder.title}
      size='lg'
      heightMode='auto'
      open={open}
      setOpen={(next) => {
        if (!next && !isSaving) onClose();
      }}>
      {saved ? (
        <div className='flex flex-col items-center px-4 py-8 text-center'>
          <div className='flex size-11 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-inset ring-emerald-100'>
            <CheckCircle2 className='size-5 text-emerald-600' />
          </div>
          <p className='mt-3 text-sm font-medium text-gray-900'>
            Work done on {jobOrder.jo_number} saved
          </p>
          <p className='mt-1 max-w-sm text-xs text-gray-500'>
            Download the certificate to print for signatures, then upload the
            signed copy from the job order's certificate badge.
          </p>
          <div className='mt-5 flex gap-2'>
            <CustomButton
              type='button'
              variant='outline'
              text='Done'
              onClick={onClose}
            />
            <CustomButton
              type='button'
              variant='primary'
              Icon={FileDown}
              text='Download certificate'
              loading={isDownloading}
              disabled={isDownloading}
              onClick={() => download(saved)}
            />
          </div>
        </div>
      ) : (
        <div className='space-y-4 py-2'>
          <dl className='grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3 sm:grid-cols-4'>
            {details.map(({ label, value }) => (
              <div
                key={label}
                className='min-w-0'>
                <dt className='text-[11px] text-gray-400'>{label}</dt>
                <dd className='truncate text-xs font-medium text-gray-700'>
                  {value || "Not given"}
                </dd>
              </div>
            ))}
          </dl>
          {isMissingDetails && (
            <p className='text-xs text-amber-700'>
              The certificate prints the installation and location from the job
              order. Edit the job order to add them.
            </p>
          )}

          <label className='block sm:w-56'>
            <span className={fieldLabel}>Work completed on</span>
            <Input
              type='date'
              value={completedOn}
              onChange={(e) => setCompletedOn(e.target.value)}
              disabled={isViewer}
              className='h-9'
            />
            <span className='mt-1 block text-[11px] text-gray-400'>
              Printed when no activity has its own date
            </span>
          </label>

          <div className='space-y-2'>
            <div>
              <h3 className='text-sm font-medium text-gray-900'>Work done</h3>
              <p className='mt-0.5 text-xs text-gray-500'>
                Actual quantities and the dates the work was done, as they go on
                the certificate. Until saved, the quantities are the job
                order's. They use up the schedule of rates; SOR left counts them
                as written here.
              </p>
            </div>
            <JobOrderActivitiesTable
              form='completion'
              entries={entries}
              sorLeft={sorLeft}
              disabled={isViewer}
              onChange={(key, entry) =>
                setEntries((prev) => ({ ...prev, [key]: entry }))
              }
            />
          </div>

          <div className='flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4'>
            <CustomButton
              type='button'
              variant='outline'
              Icon={FileDown}
              text='Download certificate'
              loading={isDownloading}
              disabled={isDownloading}
              onClick={() => download(certificate())}
            />
            <div className='flex gap-2'>
              <CustomButton
                type='button'
                variant='outline'
                text={isViewer ? "Close" : "Cancel"}
                disabled={isSaving}
                onClick={onClose}
              />
              {!isViewer && (
                <CustomButton
                  type='button'
                  variant='primary'
                  text='Save work done'
                  loading={isSaving}
                  disabled={isSaving}
                  onClick={save}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </DialogWindow>
  );
};

export default JobOrderCompletionDialog;

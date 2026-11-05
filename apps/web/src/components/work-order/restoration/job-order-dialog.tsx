"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { CheckCircle2, FileDown } from "lucide-react";
import { jobOrderSchemas } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { cn } from "@/lib/utils";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import JobOrderActivitiesTable, {
  toActivityEntries,
  toActivityRows,
  type JobOrderActivityEntries,
  type JobOrderActivityRow,
} from "./job-order-activities-table";
import type { JobOrderFormContent } from "./job-order-form-pdf";
import { sorLeftByRow } from "./restoration-display";
import type { RestorationRate } from "./restoration-rates-table";
import useJobOrderFormDownload from "./use-job-order-form-download";

// A restoration job order as getJobOrders returns it. Job orders saved before
// the client's forms were added have none of their fields.
export interface JobOrder {
  id: number;
  jo_number: string;
  title: string;
  start_date: string | Date;
  end_date: string | Date;
  description: string | null;
  issued_by?: string | null;
  rc_noa_number?: string | null;
  rc_noa_date?: string | Date | null;
  ola_number?: string | null;
  po_number?: string | null;
  installation_name?: string | null;
  location?: string | null;
  mobilization_date?: string | Date | null;
  activities?: JobOrderActivityRow[] | null;
  // The work as done, for the work completion certificate.
  completed_on?: string | Date | null;
  completion_activities?: JobOrderActivityRow[] | null;
  documents: unknown;
  vendors: { id: number; name: string }[];
}

// What the job order form takes from its work order.
export interface JobOrderWorkOrder {
  title: string;
  start_date: string | Date;
  end_date: string | Date;
  client_name: string | null;
  parent_client_name: string | null;
  rate_contract_number: string | null;
  agreement_number: string | null;
}

interface Props {
  // The work order's restoration row.
  restorationId: number;
  workOrder: JobOrderWorkOrder;
  // The work order's restoration schedule of rates.
  rates: RestorationRate[];
  open: boolean;
  onClose: () => void;
  // The job order being edited; a new one when left out.
  editing?: JobOrder | null;
}

// The form's text and date fields, dates as yyyy-MM-dd.
interface FormValues {
  jo_number: string;
  title: string;
  start_date: string;
  end_date: string;
  installation_name: string;
  location: string;
  mobilization_date: string;
  description: string;
  issued_by: string;
  rc_noa_number: string;
  rc_noa_date: string;
  ola_number: string;
  po_number: string;
}

const fieldLabel = "mb-1 block text-xs font-medium text-gray-700";

const toDateInput = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "yyyy-MM-dd") : "";
const toDate = (value: string) => (value ? new Date(value) : undefined);

// The latest job order with its contract references filled in. A new job
// order under the same rate contract most likely shares them.
const latestWithContract = (jobOrders: JobOrder[]) =>
  [...jobOrders]
    .sort((a, b) => b.id - a.id)
    .find(
      (jobOrder) =>
        jobOrder.rc_noa_number || jobOrder.ola_number || jobOrder.po_number,
    );

// The form's values for a job order, with the contract references the job
// order doesn't have taken from the work order.
const formValues = (
  jobOrder: JobOrder | null | undefined,
  contractSource: JobOrder | null | undefined,
  workOrder: JobOrderWorkOrder,
): FormValues => ({
  jo_number: jobOrder?.jo_number ?? "",
  title: jobOrder?.title ?? "",
  start_date: toDateInput(jobOrder?.start_date ?? new Date()),
  end_date: toDateInput(jobOrder?.end_date ?? new Date()),
  installation_name: jobOrder?.installation_name ?? "",
  location: jobOrder?.location ?? "",
  mobilization_date: toDateInput(jobOrder?.mobilization_date),
  description: jobOrder?.description ?? "",
  issued_by:
    contractSource?.issued_by ??
    [workOrder.parent_client_name, workOrder.client_name]
      .filter(Boolean)
      .join(", "),
  rc_noa_number:
    contractSource?.rc_noa_number ?? workOrder.rate_contract_number ?? "",
  rc_noa_date: toDateInput(contractSource?.rc_noa_date ?? workOrder.start_date),
  ola_number: contractSource?.ola_number ?? workOrder.agreement_number ?? "",
  po_number: contractSource?.po_number ?? "",
});

const Field = ({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <label className={cn("block", className)}>
    <span className={fieldLabel}>{label}</span>
    {children}
    {hint && (
      <span className='mt-1 block text-[11px] text-gray-400'>{hint}</span>
    )}
  </label>
);

const FormSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className='space-y-3 border-t border-gray-100 pt-4 first:border-t-0 first:pt-0'>
    <div>
      <h3 className='text-sm font-medium text-gray-900'>{title}</h3>
      {description && (
        <p className='mt-0.5 text-xs text-gray-500'>{description}</p>
      )}
    </div>
    {children}
  </section>
);

// Creates or edits a restoration job order: the client's job order form, and
// the vendors the work is given to.
const JobOrderDialog = ({
  restorationId,
  workOrder,
  rates,
  open,
  onClose,
  editing,
}: Props) => {
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const [values, setValues] = useState<FormValues>(() =>
    formValues(null, null, workOrder),
  );
  const [activities, setActivities] = useState<JobOrderActivityEntries>({});
  const [vendorIds, setVendorIds] = useState<number[]>([]);
  // The job order as saved, ready to download as the client's form.
  const [saved, setSaved] = useState<JobOrderFormContent | null>(null);
  const { download, isDownloading } = useJobOrderFormDownload(workOrder);

  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery(
    { work_order_site_id: restorationId },
    { enabled: open },
  );
  const sorLeft = sorLeftByRow(
    rates,
    (jobOrdersQuery.data ?? []) as JobOrder[],
  );

  const vendorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: open },
  );
  // Inactive vendors can't take new job orders, but an edit keeps its own.
  const vendors = (vendorsQuery.data?.contractors ?? []).filter(
    (vendor: any) =>
      vendor.status === "active" || vendorIds.includes(vendor.id),
  );

  // Filled in once as the dialog opens, so a refetch doesn't undo typing.
  useEffect(() => {
    if (!open) return;
    const jobOrders =
      utils.jobOrderQuery.getJobOrders.getData({
        work_order_site_id: restorationId,
      }) ?? [];
    setValues(
      formValues(editing, editing ?? latestWithContract(jobOrders), workOrder),
    );
    setActivities(toActivityEntries(editing?.activities));
    setVendorIds(editing?.vendors.map((vendor) => vendor.id) ?? []);
    setSaved(null);
  }, [open, editing]);

  const setValue =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  // Stays open on the saved job order, so its form can be downloaded.
  const onSaved = async (jobOrder: JobOrderFormContent) => {
    setSaved(jobOrder);
    await utils.jobOrderQuery.getJobOrders.invalidate({
      work_order_site_id: restorationId,
    });
  };
  const onError = (error: unknown) => handleError(error, { showToast: true });

  const createJobOrder = trpc.jobOrderMutation.createJobOrder.useMutation({
    onError,
  });
  const updateJobOrder = trpc.jobOrderMutation.updateJobOrder.useMutation({
    onError,
  });

  const save = () => {
    const parsed = jobOrderSchemas.baseJobOrderSchema.safeParse({
      ...values,
      start_date: toDate(values.start_date),
      end_date: toDate(values.end_date),
      rc_noa_date: toDate(values.rc_noa_date) ?? null,
      mobilization_date: toDate(values.mobilization_date) ?? null,
      activities: toActivityRows(activities),
      contractor_ids: vendorIds,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the job order");
      return;
    }

    const jobOrder = parsed.data;
    const options = { onSuccess: () => onSaved(jobOrder) };
    if (editing) {
      updateJobOrder.mutate({ ...jobOrder, id: editing.id }, options);
    } else {
      createJobOrder.mutate(
        { ...jobOrder, work_order_site_id: restorationId },
        options,
      );
    }
  };

  const isSaving = createJobOrder.isPending || updateJobOrder.isPending;

  return (
    <DialogWindow
      title={
        saved ? "Job Order Saved" : editing ? "Edit Job Order" : "New Job Order"
      }
      description={
        saved
          ? undefined
          : "Fill in the client's job order form and give the work to vendors"
      }
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
            Job order {saved.jo_number} {editing ? "updated" : "added"}
          </p>
          <p className='mt-1 max-w-sm text-xs text-gray-500'>
            Download its form to print for the installation manager's and the
            contractor representative's signatures.
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
              text='Download form'
              loading={isDownloading}
              disabled={isDownloading}
              onClick={() => download(saved)}
            />
          </div>
        </div>
      ) : (
        <div className='space-y-4 py-2'>
          <FormSection
            title='Job order'
            description='As the installation manager issues it.'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-[14rem_1fr]'>
              <Field label='Job order number'>
                <Input
                  value={values.jo_number}
                  onChange={setValue("jo_number")}
                  placeholder='e.g. CA/GGS/05-26/OC/03'
                  className='h-9'
                />
              </Field>
              <Field label='Title'>
                <Input
                  value={values.title}
                  onChange={setValue("title")}
                  placeholder='What the job order covers'
                  className='h-9'
                />
              </Field>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <Field label='Installation name'>
                <Input
                  value={values.installation_name}
                  onChange={setValue("installation_name")}
                  placeholder='e.g. CA GGS RDS'
                  className='h-9'
                />
              </Field>
              <Field label='Location of the job'>
                <Input
                  value={values.location}
                  onChange={setValue("location")}
                  placeholder='e.g. CA #42, well site area'
                  className='h-9'
                />
              </Field>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              <Field label='Job order date'>
                <Input
                  type='date'
                  value={values.start_date}
                  onChange={setValue("start_date")}
                  className='h-9'
                />
              </Field>
              <Field label='Scheduled completion'>
                <Input
                  type='date'
                  value={values.end_date}
                  min={values.start_date || undefined}
                  onChange={setValue("end_date")}
                  className='h-9'
                />
              </Field>
              <Field
                label='Mobilization date'
                hint='Only for ex-situ bioremediation jobs'>
                <Input
                  type='date'
                  value={values.mobilization_date}
                  onChange={setValue("mobilization_date")}
                  className='h-9'
                />
              </Field>
            </div>

            <Field label='Description'>
              <Textarea
                value={values.description}
                onChange={setValue("description")}
                placeholder='Optional, not printed on the form'
                rows={2}
              />
            </Field>
          </FormSection>

          <FormSection
            title='Contract'
            description='Filled in from the work order and its last job order. Check them against the issued form.'>
            <Field label='Issuing office'>
              <Input
                value={values.issued_by}
                onChange={setValue("issued_by")}
                placeholder='e.g. ONGC, Assam Asset, Surface Team'
                className='h-9'
              />
            </Field>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <Field label='RC NOA number'>
                <Input
                  value={values.rc_noa_number}
                  onChange={setValue("rc_noa_number")}
                  className='h-9'
                />
              </Field>
              <Field label='RC NOA date'>
                <Input
                  type='date'
                  value={values.rc_noa_date}
                  onChange={setValue("rc_noa_date")}
                  className='h-9'
                />
              </Field>
              <Field label='OLA number'>
                <Input
                  value={values.ola_number}
                  onChange={setValue("ola_number")}
                  className='h-9'
                />
              </Field>
              <Field label='PO number'>
                <Input
                  value={values.po_number}
                  onChange={setValue("po_number")}
                  className='h-9'
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title='Activities'
            description='Write each quantity as it should read on the form, such as 25 × 20 = 500, No, or To be assessed later. Rows left blank print empty. SOR left is what the completion certificates have left of the schedule of rates.'>
            <JobOrderActivitiesTable
              entries={activities}
              sorLeft={sorLeft}
              onChange={(key, entry) =>
                setActivities((prev) => ({ ...prev, [key]: entry }))
              }
            />
          </FormSection>

          <FormSection
            title='Vendors'
            description='Who the work is given to.'>
            <div className='max-h-44 overflow-y-auto rounded-lg border bg-white p-2'>
              {vendors.length === 0 ? (
                <p className='px-1 py-2 text-xs text-gray-400'>
                  {vendorsQuery.isLoading
                    ? "Loading vendors..."
                    : "No vendors yet. Add them on the Vendors page."}
                </p>
              ) : (
                <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
                  {vendors.map((vendor: any) => (
                    <label
                      key={vendor.id}
                      className='flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50'>
                      <Checkbox
                        checked={vendorIds.includes(vendor.id)}
                        onCheckedChange={(checked) =>
                          setVendorIds((prev) =>
                            checked === true
                              ? [...prev, vendor.id]
                              : prev.filter((id) => id !== vendor.id),
                          )
                        }
                      />
                      {vendor.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          <div className='flex justify-end gap-2 border-t border-gray-100 pt-4'>
            <CustomButton
              type='button'
              variant='outline'
              text='Cancel'
              disabled={isSaving}
              onClick={onClose}
            />
            <CustomButton
              type='button'
              variant='primary'
              text={editing ? "Save job order" : "Add job order"}
              loading={isSaving}
              disabled={isSaving}
              onClick={save}
            />
          </div>
        </div>
      )}
    </DialogWindow>
  );
};

export default JobOrderDialog;

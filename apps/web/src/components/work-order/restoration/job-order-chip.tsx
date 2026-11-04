"use client";
import React from "react";
import { format } from "date-fns";
import { Info } from "lucide-react";
import {
  capitalFirstLetter,
  constants,
  jobOrderQuantity,
  type JobOrderActivityKey,
} from "@pkg/utils";
import { cn } from "@/lib/utils";
import { toDocuments } from "@/lib/documents";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { JobOrder } from "./job-order-dialog";

const { JOB_ORDER_ACTIVITIES } = constants;

// The form's rows, named short enough for a narrow card.
const SHORT_LABELS: Record<JobOrderActivityKey, string> = {
  spill_cleaning: "Spill area cleaning",
  oily_slush_lifting: "Oily slush lifting",
  excavation: "Excavation",
  transportation: "Transportation",
  transportation_up_to_5_km: "Transport up to 5 KM",
  transportation_over_20_km: "Transport over 20 KM",
  transportation_over_40_km: "Transport over 40 KM, per km",
  refilling: "Refilling",
  bioremediation_volume: "Bioremediation (volume)",
  bioremediation_weight: "Bioremediation (weight)",
};

const formatDate = (value: string | Date | null | undefined) =>
  value ? format(new Date(value), "d MMM yyyy") : null;

// A quantity as written, with its unit when it is a measurement.
const withUnit = (quantity: string | undefined, unit: string) => {
  if (!quantity) return null;
  return jobOrderQuantity(quantity) !== null && unit
    ? `${quantity} ${unit}`
    : quantity;
};

// Where the job order stands: certified once a signed certificate is
// uploaded, and its work done saved before that.
const jobOrderStatus = (jobOrder: JobOrder) => {
  if (toDocuments(jobOrder.documents).length > 0) {
    return {
      label: "Certified complete",
      style: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
  }
  if (jobOrder.completion_activities != null) {
    return {
      label: "Work done saved",
      style: "bg-amber-50 text-amber-700 ring-amber-200",
    };
  }
  return { label: "Open", style: "bg-gray-50 text-gray-600 ring-gray-200" };
};

const Detail = ({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("min-w-0", className)}>
    <dt className='text-[11px] text-gray-400'>{label}</dt>
    <dd className='mt-0.5 break-words text-xs text-gray-800'>
      {value || <span className='text-gray-300'>—</span>}
    </dd>
  </div>
);

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className='border-t border-gray-100 px-4 py-3'>
    <h4 className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
      {title}
    </h4>
    {children}
  </section>
);

// Everything on a job order: its form, contract, activities as ordered and as
// done, vendors and certificates.
const JobOrderDetails = ({ jobOrder }: { jobOrder: JobOrder }) => {
  const status = jobOrderStatus(jobOrder);
  const certificateCount = toDocuments(jobOrder.documents).length;
  const ordered = new Map(
    (jobOrder.activities ?? []).map((row) => [row.key, row.quantity]),
  );
  const done = new Map(
    (jobOrder.completion_activities ?? []).map((row) => [
      row.key,
      row.quantity,
    ]),
  );
  const activities = JOB_ORDER_ACTIVITIES.filter(
    (activity) => ordered.get(activity.key) || done.get(activity.key),
  );
  const rcNoa = [jobOrder.rc_noa_number, formatDate(jobOrder.rc_noa_date)]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className='px-4 py-3'>
        <div className='flex items-center justify-between gap-3'>
          <p className='font-mono text-xs font-semibold text-purple-700'>
            {jobOrder.jo_number}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              status.style,
            )}>
            {status.label}
          </span>
        </div>
        <p className='mt-1 text-sm font-medium text-gray-900'>
          {jobOrder.title}
        </p>
        {jobOrder.description && (
          <p className='mt-1 whitespace-pre-wrap text-xs text-gray-500'>
            {jobOrder.description}
          </p>
        )}
      </div>

      <Section title='Job order'>
        <dl className='grid grid-cols-2 gap-x-4 gap-y-2'>
          <Detail
            label='Job order date'
            value={formatDate(jobOrder.start_date)}
          />
          <Detail
            label='Scheduled completion'
            value={formatDate(jobOrder.end_date)}
          />
          <Detail
            label='Installation'
            value={jobOrder.installation_name}
          />
          <Detail
            label='Location'
            value={jobOrder.location}
          />
          <Detail
            label='Mobilization'
            value={formatDate(jobOrder.mobilization_date) ?? "Not applicable"}
          />
          <Detail
            label='Work completed on'
            value={formatDate(jobOrder.completed_on)}
          />
        </dl>
      </Section>

      <Section title='Contract'>
        <dl className='grid grid-cols-2 gap-x-4 gap-y-2'>
          <Detail
            label='Issuing office'
            value={jobOrder.issued_by}
            className='col-span-2'
          />
          <Detail
            label='RC NOA'
            value={rcNoa}
            className='col-span-2'
          />
          <Detail
            label='OLA number'
            value={jobOrder.ola_number}
          />
          <Detail
            label='PO number'
            value={jobOrder.po_number}
          />
        </dl>
      </Section>

      <Section title='Activities'>
        {activities.length === 0 ? (
          <p className='text-xs text-gray-400'>
            None written on the job order form.
          </p>
        ) : (
          <table className='w-full text-xs'>
            <thead>
              <tr className='text-left text-[11px] text-gray-400'>
                <th className='pb-1 font-medium'>Activity</th>
                <th className='pb-1 pl-2 text-right font-medium'>Ordered</th>
                <th className='pb-1 pl-2 text-right font-medium'>Done</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {activities.map((activity) => (
                <tr key={activity.key}>
                  <td className='py-1 text-gray-700'>
                    {SHORT_LABELS[activity.key]}
                  </td>
                  <td className='py-1 pl-2 text-right tabular-nums text-gray-800'>
                    {withUnit(ordered.get(activity.key), activity.unit) ?? (
                      <span className='text-gray-300'>—</span>
                    )}
                  </td>
                  <td className='py-1 pl-2 text-right tabular-nums text-gray-800'>
                    {withUnit(
                      done.get(activity.key),
                      activity.completionUnit,
                    ) ?? <span className='text-gray-300'>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title='Vendors and certificates'>
        <dl className='grid grid-cols-2 gap-x-4 gap-y-2'>
          <Detail
            label='Vendors'
            value={jobOrder.vendors
              .map((vendor) => capitalFirstLetter(vendor.name))
              .join(", ")}
            className='col-span-2'
          />
          <Detail
            label='Signed certificates'
            value={
              certificateCount > 0
                ? `${certificateCount} uploaded`
                : "None uploaded"
            }
            className='col-span-2'
          />
        </dl>
      </Section>
    </>
  );
};

// A job order's number as a chip that shows all of the job order on hover.
const JobOrderChip = ({ jobOrder }: { jobOrder: JobOrder }) => (
  <HoverCard
    openDelay={150}
    closeDelay={100}>
    <HoverCardTrigger asChild>
      <button
        type='button'
        aria-label={`Job order ${jobOrder.jo_number} details`}
        className='inline-flex shrink-0 cursor-default items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-200 transition-colors bg-purple-50 hover:bg-purple-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 data-[state=open]:bg-purple-100'>
        {jobOrder.jo_number}
        <Info className='size-3 opacity-70' />
      </button>
    </HoverCardTrigger>
    <HoverCardContent
      side='bottom'
      align='start'
      collisionPadding={16}
      className='max-h-[70vh] w-[26rem] overflow-y-auto p-0'>
      <JobOrderDetails jobOrder={jobOrder} />
    </HoverCardContent>
  </HoverCard>
);

export default JobOrderChip;

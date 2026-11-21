import React from "react";
import RecordCode from "@/components/shared/record-code";
import { format } from "date-fns";
import { Building2, CalendarDays, MapPin } from "lucide-react";
import {
  capitalFirstLetter,
  capitalizeEachWord,
  formatCurrency,
} from "@pkg/utils";
import { Field, Metric } from "@/components/shared/detail-card-parts";
import type { OfficeDetails } from "./office-types";

const formatDate = (value: string | Date) =>
  format(new Date(value), "dd MMM yyyy");

const formatCount = (value: number) => value.toLocaleString("en-IN");

// The top of an office's page: who it is, totals across its sites and work
// orders, then its details.
const OfficeDetailsCard = ({ details }: { details: OfficeDetails }) => {
  const { office, sites, workOrders } = details;
  const location = [office.city, office.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part))
    .join(", ");
  const address = [
    capitalFirstLetter(office.address),
    [location, office.pincode].filter(Boolean).join(" - "),
  ]
    .filter(Boolean)
    .join(", ");

  const budget = Number(details.totalBudgetAmount) || 0;
  // Bioremediation completion amounts, as the client page counts them.
  const activitySpend = Number(details.totalExpenseAmount) || 0;
  const spendPct = budget > 0 ? (activitySpend / budget) * 100 : 0;

  const workOrderHint = [
    `${formatCount(workOrders.pending)} pending`,
    `${formatCount(workOrders.completed)} completed`,
  ].join(" · ");

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
      {/* Identity */}
      <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5'>
        <div className='flex min-w-0 items-center gap-3'>
          <div className='shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-700 ring-1 ring-emerald-100'>
            <Building2 className='size-4' />
          </div>
          <div className='min-w-0'>
            <h2
              className='truncate text-base font-semibold text-gray-900'
              title={office.name}>
              {office.name.toUpperCase()}
            </h2>
            <div className='mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500'>
              <RecordCode code={office.code} />
              {location && (
                <span className='inline-flex min-w-0 items-center gap-1.5'>
                  <MapPin className='size-3.5 shrink-0 text-gray-400' />
                  <span className='truncate'>{location}</span>
                </span>
              )}
              <span className='inline-flex items-center gap-1.5'>
                <CalendarDays className='size-3.5 shrink-0 text-gray-400' />
                Added {formatDate(office.created_at)}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Metrics, split by hairlines that hold in every column count. */}
      <div className='grid grid-cols-2 gap-px border-y border-gray-200 bg-gray-200 lg:grid-cols-4 [&>*]:bg-gray-50'>
        <Metric
          label='Sites'
          value={formatCount(sites.total)}
          hint={`${formatCount(sites.active)} active`}
        />
        <Metric
          label='Work orders'
          value={formatCount(workOrders.total)}
          hint={workOrderHint}
        />
        <Metric
          label='Budget'
          value={formatCurrency(budget)}
          hint='schedule of rates total'
        />
        <Metric
          label='Activity spend'
          value={formatCurrency(activitySpend)}
          hint={`${spendPct.toFixed(1)}% of budget`}
        />
      </div>

      {/* Details */}
      <div className='grid grid-cols-2 gap-x-6 gap-y-3 px-6 py-4 sm:grid-cols-4 xl:grid-cols-6'>
        <Field
          label='GST number'
          value={
            office.gst_number && (
              <span className='font-mono'>{office.gst_number}</span>
            )
          }
        />
        <Field
          label='Email'
          className='sm:col-span-2'
          value={
            office.email && (
              <a
                href={`mailto:${office.email}`}
                title={office.email}
                className='hover:text-emerald-700 hover:underline'>
                {office.email}
              </a>
            )
          }
        />
        <Field
          label='Last updated'
          value={formatDate(office.updated_at)}
        />
        <Field
          label='Address'
          value={address}
          className='col-span-2'
        />
      </div>
    </div>
  );
};

export default OfficeDetailsCard;

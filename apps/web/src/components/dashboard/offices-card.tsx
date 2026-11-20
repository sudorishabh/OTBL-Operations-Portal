"use client";
import React from "react";
import Link from "next/link";
import { capitalFirstLetter, formatCurrency } from "@pkg/utils";
import {
  CARD_ERROR,
  CardLink,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { formatCompactRupees, formatCount, formatCountOf } from "./format";
import { useOfficeBreakdown } from "./use-dashboard";

// A work order count's share of the office's, as a thin bar with no text:
// the figures beside it say what it is. Statuses wear the portal's status
// colours, in the order the status card uses.
const StatusBar = ({
  pending,
  completed,
  cancelled,
}: {
  pending: number;
  completed: number;
  cancelled: number;
}) => (
  <div
    aria-hidden='true'
    className='mt-1 flex h-1.5 w-full gap-0.5'>
    {[
      { value: pending, className: "bg-amber-500" },
      { value: completed, className: "bg-emerald-600" },
      { value: cancelled, className: "bg-rose-600" },
    ]
      .filter((part) => part.value > 0)
      .map((part) => (
        <span
          key={part.className}
          className={`h-full rounded-full ${part.className}`}
          style={{ flexGrow: part.value, flexBasis: 0 }}
        />
      ))}
  </div>
);

const HEAD =
  "px-4 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase";

// The offices with the most pending work: their work orders by status,
// their sites and what has been spent in their work orders.
export const OfficesCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useOfficeBreakdown();

  return (
    <DashboardCard
      className={className}
      title='Busiest offices'
      description={
        data && data.officeCount > 0
          ? `Most pending work orders, of ${formatCountOf(data.officeCount, "office")} with work`
          : "Most pending work orders"
      }
      action={<CardLink href='/dashboard/office-site'>All offices</CardLink>}>
      {isPending ? (
        <CardSkeleton
          rows={6}
          label='Loading offices'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.offices.length === 0 ? (
        <CardMessage>No office has work orders yet.</CardMessage>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[34rem] text-[13px]'>
            <thead className='border-b border-gray-200 bg-gray-50/60 text-left'>
              <tr>
                <th className={HEAD}>Office</th>
                <th className={HEAD}>Work orders</th>
                <th className={`${HEAD} text-right`}>Sites</th>
                <th className={`${HEAD} text-right`}>Spent</th>
              </tr>
            </thead>
            <tbody>
              {data.offices.map((office) => (
                <tr
                  key={office.id}
                  className='border-b border-gray-100 last:border-0'>
                  <td className='max-w-[14rem] px-4 py-2'>
                    <Link
                      href={`/dashboard/office-site/${office.id}`}
                      className='block truncate font-medium text-gray-800 hover:text-emerald-700 hover:underline'>
                      {capitalFirstLetter(office.name)}
                    </Link>
                    <span className='block truncate text-[11px] text-gray-400'>
                      {office.code} · {capitalFirstLetter(office.city)}
                    </span>
                  </td>
                  <td className='w-[40%] px-4 py-2'>
                    <span className='text-[12px] text-gray-600'>
                      <span className='font-semibold text-gray-900'>
                        {formatCount(office.pending)}
                      </span>{" "}
                      pending · {formatCount(office.completed)} completed
                      {office.cancelled > 0 &&
                        ` · ${formatCount(office.cancelled)} cancelled`}
                    </span>
                    <StatusBar
                      pending={office.pending}
                      completed={office.completed}
                      cancelled={office.cancelled}
                    />
                  </td>
                  <td className='px-4 py-2 text-right tabular-nums text-gray-700'>
                    {formatCount(office.sites)}
                  </td>
                  <td
                    className='px-4 py-2 text-right tabular-nums text-gray-900'
                    title={formatCurrency(office.spent)}>
                    {formatCompactRupees(office.spent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
};

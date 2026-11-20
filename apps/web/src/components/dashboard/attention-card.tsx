"use client";
import React, { type ComponentType } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileClock,
  FileSignature,
  ReceiptText,
  ShoppingCart,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/lib/trpc";
import {
  CARD_ERROR,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { formatCount, formatDay } from "./format";
import { useAttention, useModuleCounts } from "./use-dashboard";

const { CONTRACT_ORDER_TYPE, PROPOSAL_STATUS } = constants;

type DeadlineRow =
  RouterOutputs["dashboardQuery"]["getAttention"]["overdue"]["workOrders"][number];

const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days from today to a date: negative once it has passed.
const daysFromToday = (value: Date | string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - today.getTime()) / DAY_MS);
};

// "Today", "In 3 days", "12 days late".
const dueLabel = (value: Date | string) => {
  const days = daysFromToday(value);
  if (days === 0) return "Today";
  if (days > 0) return `In ${days} day${days === 1 ? "" : "s"}`;
  return `${-days} day${days === -1 ? "" : "s"} late`;
};

// A few work orders against a deadline, each leading to its page.
const DeadlineList = ({
  rows,
  late,
}: {
  rows: DeadlineRow[];
  late: boolean;
}) => (
  <ul className='mt-1.5 divide-y divide-gray-100 rounded-lg border border-gray-100'>
    {rows.map((row) => (
      <li key={row.id}>
        <Link
          href={`/dashboard/work-order/${row.id}`}
          className='flex items-center gap-3 px-3 py-1.5 text-[12px] transition-colors hover:bg-gray-50'>
          <span className='min-w-0 flex-1'>
            <span className='block truncate font-mono font-medium text-cyan-700'>
              {row.code.toUpperCase()}
            </span>
            <span className='block truncate text-[11px] text-gray-500'>
              {[row.client_name, row.office_name].filter(Boolean).join(" · ")}
            </span>
          </span>
          <span className='shrink-0 text-right'>
            <span className='block tabular-nums text-gray-700'>
              {formatDay(row.end_date)}
            </span>
            <span
              className={cn(
                "block text-[11px] font-medium",
                late ? "text-rose-600" : "text-amber-700",
              )}>
              {dueLabel(row.end_date)}
            </span>
          </span>
        </Link>
      </li>
    ))}
  </ul>
);

// One kind of deadline: its count, then the work orders ending first.
const DeadlineSection = ({
  icon: Icon,
  iconClassName,
  title,
  count,
  rows,
  late,
  emptyText,
}: {
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  title: string;
  count: number;
  rows: DeadlineRow[];
  late: boolean;
  emptyText: string;
}) => (
  <div>
    <div className='flex items-center justify-between gap-2 text-[12px]'>
      <span className='flex items-center gap-1.5 font-medium text-gray-700'>
        <Icon
          aria-hidden='true'
          className={cn(
            "size-3.5",
            count > 0 ? iconClassName : "text-gray-300",
          )}
        />
        {title}
      </span>
      <span className='font-semibold tabular-nums text-gray-900'>
        {formatCount(count)}
      </span>
    </div>
    {count > 0 ? (
      <>
        <DeadlineList
          rows={rows}
          late={late}
        />
        {count > rows.length && (
          <p className='mt-1 text-[11px] text-gray-400'>
            Showing the {rows.length} ending first of {formatCount(count)}.
          </p>
        )}
      </>
    ) : (
      <p className='mt-1 flex items-center gap-1.5 text-[11px] text-gray-500'>
        <CheckCircle2
          aria-hidden='true'
          className='size-3 text-emerald-600'
        />
        {emptyText}
      </p>
    )}
  </div>
);

// A count of records waiting on something, with what they wait on.
const FollowUp = ({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | undefined;
}) => (
  <li className='flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5'>
    <Icon
      aria-hidden='true'
      className='size-3.5 shrink-0 text-gray-400'
    />
    <span className='min-w-0 flex-1 text-[11px] leading-tight text-gray-600'>
      {label}
    </span>
    <span className='shrink-0 text-[13px] font-semibold tabular-nums text-gray-900'>
      {value === undefined ? "—" : formatCount(value)}
    </span>
  </li>
);

// What needs following up: pending work orders past or near their end date,
// then the job orders, contract orders and proposals still waiting on a
// document or a decision.
export const AttentionCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useAttention();
  const counts = useModuleCounts().data;

  const pendingOrders = (type: string) => {
    const orders = data?.contractOrders[type];
    return orders ? orders.total - orders.completed : 0;
  };

  return (
    <DashboardCard
      className={className}
      title='Needs attention'
      description='Pending work orders and records waiting on documents'>
      {isPending ? (
        <CardSkeleton
          rows={5}
          label='Loading what needs attention'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : (
        <div className='space-y-4 px-4 py-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <DeadlineSection
              icon={TriangleAlert}
              iconClassName='text-rose-600'
              title='Past their end date'
              count={data.overdue.count}
              rows={data.overdue.workOrders}
              late
              emptyText='No pending work order is past its end date.'
            />
            <DeadlineSection
              icon={CalendarClock}
              iconClassName='text-amber-600'
              title={`Ending in the next ${data.endingSoon.days} days`}
              count={data.endingSoon.count}
              rows={data.endingSoon.workOrders}
              late={false}
              emptyText={`No pending work order ends in the next ${data.endingSoon.days} days.`}
            />
          </div>

          <div>
            <h3 className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase'>
              Waiting on paperwork
            </h3>
            <ul className='grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3'>
              <FollowUp
                icon={FileClock}
                label='Job orders to certify'
                value={data.jobOrders.awaitingCertificate}
              />
              <FollowUp
                icon={ReceiptText}
                label='Certified job orders to invoice'
                value={data.jobOrders.awaitingInvoice}
              />
              <FollowUp
                icon={ShoppingCart}
                label='Purchase orders to complete'
                value={pendingOrders(CONTRACT_ORDER_TYPE.PURCHASE_ORDER)}
              />
              <FollowUp
                icon={Truck}
                label='Sub-contracts to complete'
                value={pendingOrders(CONTRACT_ORDER_TYPE.SUB_CONTRACT)}
              />
              <FollowUp
                icon={FileSignature}
                label='Proposals awaiting a decision'
                value={counts?.proposals[PROPOSAL_STATUS.PENDING]}
              />
              <FollowUp
                icon={ClipboardList}
                label='Open job orders'
                value={data.jobOrders.open}
              />
            </ul>
          </div>
        </div>
      )}
    </DashboardCard>
  );
};

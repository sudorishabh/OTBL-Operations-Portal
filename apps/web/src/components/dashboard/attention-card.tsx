"use client";
import React, { useState, type ComponentType } from "react";
import Link from "next/link";
import { CalendarClock, CheckCircle2, TriangleAlert } from "lucide-react";
import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/lib/trpc";
import {
  CARD_ERROR,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { AttentionDialog } from "./attention-dialog";
import { PaperworkFollowUps, dueLabel } from "./attention-parts";
import { formatCount, formatDay } from "./format";
import { useAttention, useModuleCounts } from "./use-dashboard";

const { PROPOSAL_STATUS } = constants;

type DeadlineRow =
  RouterOutputs["dashboardQuery"]["getAttention"]["overdue"]["workOrders"][number];

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
  <div className='min-w-0'>
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

// What needs following up: pending work orders past or near their end date,
// then the job orders, contract orders and proposals still waiting on a
// document or a decision.
export const AttentionCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useAttention();
  const counts = useModuleCounts().data;
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <DashboardCard
        className={className}
        onExpand={() => setExpanded(true)}
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

            <PaperworkFollowUps
              attention={data}
              proposalsPending={counts?.proposals[PROPOSAL_STATUS.PENDING]}
            />
          </div>
        )}
      </DashboardCard>
      <AttentionDialog
        open={expanded}
        onOpenChange={setExpanded}
      />
    </>
  );
};

"use client";
import React from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { constants } from "@pkg/utils";
import {
  CARD_ERROR,
  CardLink,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { MeterRow } from "./meter";
import { SegmentedBar, type Segment } from "./segmented-bar";
import { formatCount } from "./format";
import { useWorkOrderSummary } from "./use-dashboard";

const { WO_PROCESS } = constants;

// Each process, in the order the work order form lists them.
const PROCESSES = [
  { key: WO_PROCESS.BIOREMEDIATION, label: "Bioremediation" },
  { key: WO_PROCESS.RESTORATION, label: "Restoration" },
  {
    key: WO_PROCESS.BIOREMEDIATION_RESTORATION,
    label: "Bioremediation & restoration",
  },
];

// The small headings splitting the card's lists.
const Heading = ({ children }: { children: React.ReactNode }) => (
  <h3 className='mb-2 text-[11px] font-semibold tracking-[0.08em] text-gray-400 uppercase'>
    {children}
  </h3>
);

// How the visible work orders stand: by status, how far each process has
// got, and how many of their sites and restorations are complete.
export const WorkOrderStatusCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useWorkOrderSummary();

  // Statuses wear the portal's status colours, each with its icon.
  const segments: Segment[] = data
    ? [
        {
          key: "pending",
          label: "Pending",
          value: data.pending,
          fillClassName: "bg-amber-500",
          textClassName: "text-gray-950",
          icon: Clock3,
          iconClassName: "text-amber-600",
        },
        {
          key: "completed",
          label: "Completed",
          value: data.completed,
          fillClassName: "bg-emerald-600",
          textClassName: "text-white",
          icon: CheckCircle2,
          iconClassName: "text-emerald-600",
        },
        {
          key: "cancelled",
          label: "Cancelled",
          value: data.cancelled,
          fillClassName: "bg-rose-600",
          textClassName: "text-white",
          icon: XCircle,
          iconClassName: "text-rose-600",
        },
      ]
    : [];

  return (
    <DashboardCard
      className={className}
      title='Work order status'
      description={
        data ? `${formatCount(data.total)} work orders` : "All work orders"
      }
      action={<CardLink href='/dashboard/work-order'>View all</CardLink>}>
      {isPending ? (
        <CardSkeleton
          rows={5}
          label='Loading work order status'
        />
      ) : !data ? (
        <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
      ) : data.total === 0 ? (
        <CardMessage>No work orders yet.</CardMessage>
      ) : (
        <div className='space-y-4 px-4 py-4'>
          <SegmentedBar
            title='Work orders by status'
            segments={segments}
          />

          <div>
            <Heading>Completed by process</Heading>
            <div className='space-y-2.5'>
              {PROCESSES.map(({ key, label }) => {
                const counts = data.byProcess[key];
                if (!counts) return null;
                return (
                  <MeterRow
                    key={key}
                    label={label}
                    value={counts.completed}
                    total={counts.total}
                    detail={`${formatCount(counts.pending)} pending · ${formatCount(counts.cancelled)} cancelled`}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <Heading>Field progress</Heading>
            <div className='space-y-2.5'>
              <MeterRow
                label='Sites completed'
                value={data.sites.completed}
                total={data.sites.total}
              />
              <MeterRow
                label='Restorations completed'
                value={data.restorations.completed}
                total={data.restorations.total}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
};

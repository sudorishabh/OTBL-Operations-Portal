"use client";
import React, { useState } from "react";
import {
  CARD_ERROR,
  CardLink,
  CardMessage,
  CardSkeleton,
  DashboardCard,
  SubHeading,
} from "./dashboard-card";
import { MeterRow } from "./meter";
import { SegmentedBar } from "./segmented-bar";
import { statusSegments } from "./status-parts";
import { formatCount, formatCountOf } from "./format";
import { WORK_ORDER_PROCESSES } from "./labels";
import { useWorkOrderSummary } from "./use-dashboard";
import { WorkOrderStatusDialog } from "./work-order-status-dialog";

// How the visible work orders stand: by status, how far each process has
// got, and how many of their sites and restorations are complete.
export const WorkOrderStatusCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useWorkOrderSummary();
  const [expanded, setExpanded] = useState(false);

  const segments = data ? statusSegments(data) : [];

  return (
    <>
      <DashboardCard
        className={className}
        onExpand={() => setExpanded(true)}
        title='Work order status'
        description={
          data ? formatCountOf(data.total, "work order") : "All work orders"
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
              <SubHeading>Completed by process</SubHeading>
              <div className='space-y-2.5'>
                {WORK_ORDER_PROCESSES.map(({ value: key, label }) => {
                  const counts = data.byProcess[key];
                  if (!counts) return null;
                  return (
                    <MeterRow
                      key={key}
                      label={label}
                      value={counts.completed}
                      total={counts.total}
                      detail={`${formatCount(counts.pending)} pending`}
                    />
                  );
                })}
              </div>
            </div>

            <div>
              <SubHeading>Field progress</SubHeading>
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
      <WorkOrderStatusDialog
        open={expanded}
        onOpenChange={setExpanded}
      />
    </>
  );
};

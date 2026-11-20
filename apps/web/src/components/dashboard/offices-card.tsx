"use client";
import React, { useState } from "react";
import {
  CARD_ERROR,
  CardLink,
  CardMessage,
  CardSkeleton,
  DashboardCard,
} from "./dashboard-card";
import { formatCountOf } from "./format";
import { OfficeTable } from "./office-table";
import { OfficesDialog } from "./offices-dialog";
import { useOfficeBreakdown } from "./use-dashboard";

// The offices with the most pending work: their work orders by status,
// their sites and what has been spent in their work orders.
export const OfficesCard = ({ className }: { className?: string }) => {
  const { data, isPending } = useOfficeBreakdown();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <DashboardCard
        className={className}
        onExpand={() => setExpanded(true)}
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
          <OfficeTable offices={data.offices} />
        )}
      </DashboardCard>
      <OfficesDialog
        open={expanded}
        onOpenChange={setExpanded}
      />
    </>
  );
};

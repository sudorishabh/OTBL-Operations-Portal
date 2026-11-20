"use client";
import React, { useState } from "react";
import { RecentWorkOrdersSkeleton } from "@/components/skeleton/dashboard/dashboard-page-skeleton";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import {
  CARD_ERROR,
  CardLink,
  CardMessage,
  DashboardCard,
} from "./dashboard-card";
import { WorkOrderTable } from "./work-order-table";
import { WorkOrdersDialog } from "./work-orders-dialog";

type WorkOrdersPage = RouterOutputs["workOrderQuery"]["getAll"];

// How many of the newest work orders are listed.
const RECENT = 8;

// The newest work orders, each leading to its page.
export const RecentWorkOrdersCard = () => {
  const { isUserLoading } = useAuthContext();
  const query = trpc.workOrderQuery.getAll.useQuery(
    { page: 1, limit: RECENT, workOrderOrder: "latest" },
    { enabled: !isUserLoading },
  );
  const page: WorkOrdersPage | undefined = query.data;
  const workOrders = page?.workOrders ?? [];
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <DashboardCard
        onExpand={() => setExpanded(true)}
        title='Recent work orders'
        description='Newest first'
        action={<CardLink href='/dashboard/work-order'>View all</CardLink>}>
        {query.isPending ? (
          <RecentWorkOrdersSkeleton />
        ) : !page ? (
          <CardMessage tone='error'>{CARD_ERROR}</CardMessage>
        ) : workOrders.length === 0 ? (
          <CardMessage>No work orders yet.</CardMessage>
        ) : (
          <WorkOrderTable workOrders={workOrders} />
        )}
      </DashboardCard>
      <WorkOrdersDialog
        open={expanded}
        onOpenChange={setExpanded}
      />
    </>
  );
};

"use client";
import React from "react";
import dynamic from "next/dynamic";
import WorkOrderDetailsSkeleton from "@/components/skeleton/work-order/work-order-details-skeleton";
import { Suspense } from "react";

const WorkOrder = dynamic(() => import("@/components/work-order/work-order"), {
  loading: () => <WorkOrderDetailsSkeleton from='client' />,
});

type PageProps = {
  params: Promise<{ workOrderId: string }>;
};

const WorkOrderPage = ({ params }: PageProps) => {
  const { workOrderId } = React.use(params);

  return (
    <Suspense fallback={<WorkOrderDetailsSkeleton from='client' />}>
      <WorkOrder
        workOrderId={workOrderId}
        from='client'
      />
    </Suspense>
  );
};
export default WorkOrderPage;

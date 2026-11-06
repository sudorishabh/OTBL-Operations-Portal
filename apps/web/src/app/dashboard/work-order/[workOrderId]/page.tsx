"use client";
import WorkOrder from "@/components/work-order/work-order";
import useHandleParams from "@/hooks/useHandleParams";
import WorkOrderDetailsSkeleton from "@/components/skeleton/work-order/work-order-details-skeleton";
import React, { useEffect } from "react";

type PageProps = {
  params: Promise<{ workOrderId: string }>;
};

const WorkOrderPageContent = ({ params }: PageProps) => {
  const { workOrderId } = React.use(params);
  const { setParam } = useHandleParams();

  useEffect(() => {
    setParam("from", "list");
  }, [workOrderId]);

  return (
    <WorkOrder
      workOrderId={workOrderId}
      from='list'
    />
  );
};

const WorkOrderPage = ({ params }: PageProps) => {
  return (
    <React.Suspense fallback={<WorkOrderDetailsSkeleton />}>
      <WorkOrderPageContent params={params} />
    </React.Suspense>
  );
};

export default WorkOrderPage;

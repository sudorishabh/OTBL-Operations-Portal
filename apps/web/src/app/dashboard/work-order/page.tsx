import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { sectionTrail } from "@/lib/breadcrumbs";
import React, { Suspense } from "react";
import WorkOrdersSkeleton from "@/components/skeleton/work-orders/work-orders-skeleton";
import WorkOrderPage from "@/components/work-orders/work-order-page";

const WorkOrders = () => {
  return (
    <PageWrapper
      breadcrumbs={sectionTrail("workOrders")}
      title='Work Order Management'
      description='Manage work orders, track their progress across offices and sites'>
      <Suspense fallback={<WorkOrdersSkeleton />}>
        <WorkOrderPage />
      </Suspense>
    </PageWrapper>
  );
};

export default WorkOrders;

"use client";
import React from "react";
import PageLoading from "@/components/loading/PageLoading";
import SiteDetailsPage from "@/components/work-order/site-details-dialog/site-details-page";

type PageProps = {
  params: Promise<{ workOrderId: string; woSiteId: string }>;
};

const WorkOrderSitePage = ({ params }: PageProps) => {
  const { workOrderId, woSiteId } = React.use(params);

  return (
    <React.Suspense fallback={<PageLoading />}>
      <SiteDetailsPage
        workOrderId={workOrderId}
        woSiteId={woSiteId}
        from='list'
      />
    </React.Suspense>
  );
};

export default WorkOrderSitePage;

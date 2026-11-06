"use client";
import React from "react";
import { SiteDetailsSkeleton } from "@/components/skeleton/work-order/site-skeletons";
import SiteDetailsPage from "@/components/work-order/site-details-dialog/site-details-page";

type PageProps = {
  params: Promise<{ workOrderId: string; woSiteId: string }>;
};

const ClientWorkOrderSitePage = ({ params }: PageProps) => {
  const { workOrderId, woSiteId } = React.use(params);

  return (
    <React.Suspense fallback={<SiteDetailsSkeleton />}>
      <SiteDetailsPage
        workOrderId={workOrderId}
        woSiteId={woSiteId}
        from='client'
      />
    </React.Suspense>
  );
};

export default ClientWorkOrderSitePage;

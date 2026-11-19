"use client";
import React from "react";
import { MapPin } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { workOrderChildTrail } from "@/lib/breadcrumbs";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import { SiteDetailsSkeleton } from "@/components/skeleton/work-order/site-skeletons";
import type { WorkOrderFrom } from "../work-order-path";
import SiteDetailsCard from "./site-details-card";
import SiteExecution from "./site-execution";
import SiteAvailability from "./site-availability";

interface Props {
  workOrderId: string;
  woSiteId: string;
  // Which work order page the trail leads back to.
  from: WorkOrderFrom;
}

// A work order site's own page: its information, estimate and completion,
// then the work carried out there.
const SiteDetailsPage = ({ workOrderId, woSiteId, from }: Props) => {
  const id = Number(woSiteId);

  const siteDetailsQuery =
    trpc.workOrderSiteQuery.getWorkOrderSiteDetails.useQuery(
      { work_order_site_id: id },
      { enabled: id > 0 },
    );
  const siteDetails = siteDetailsQuery.data;

  if (siteDetailsQuery.isLoading) return <SiteDetailsSkeleton from={from} />;

  if (siteDetailsQuery.isError) {
    return (
      <Error
        variant='inline'
        message={siteDetailsQuery.error.message || "Failed to load the site"}
      />
    );
  }

  // Only a site of this work order. The restoration row isn't a site; it has
  // its own page.
  if (
    !siteDetails ||
    siteDetails.site_id == null ||
    String(siteDetails.work_order_id) !== workOrderId
  ) {
    return (
      <PageWrapper
        title='Site'
        breadcrumbs={workOrderChildTrail({ id: workOrderId, from }, "Site")}>
        <NoFetchData
          title='Site Not Found'
          Icon={MapPin}
          description='This work order has no such site.'
        />
      </PageWrapper>
    );
  }

  const siteName = siteDetails.site.name
    ? capitalFirstLetter(siteDetails.site.name)
    : "Site";
  const description = [
    siteDetails.work_order.code,
    siteDetails.work_order.purchase_order_code &&
      `Purchase order ${siteDetails.work_order.purchase_order_code}`,
  ]
    .filter(Boolean)
    .join(" - ");
  const breadcrumbs = workOrderChildTrail(
    {
      id: workOrderId,
      code: siteDetails.work_order.code,
      from,
      client: {
        id: siteDetails.work_order.client_id,
        name: siteDetails.work_order.client_name,
      },
    },
    siteName,
  );

  return (
    <PageWrapper
      title={siteName}
      description={description}
      breadcrumbs={breadcrumbs}>
      <div className='mt-4 space-y-4'>
        <SiteDetailsCard siteDetails={siteDetails} />

        {/* A panel of its own, absent until there is something to show. */}
        <SiteAvailability
          woSiteId={siteDetails.id}
          processType={siteDetails.process_type}
          isCompleted={!!siteDetails.is_completed}
          className='rounded-lg border border-gray-200 bg-white p-5'
        />

        <section className='rounded-lg border border-gray-200 bg-white p-5'>
          <SiteExecution
            woSiteId={siteDetails.id}
            processType={siteDetails.process_type}
          />
        </section>
      </div>
    </PageWrapper>
  );
};

export default SiteDetailsPage;

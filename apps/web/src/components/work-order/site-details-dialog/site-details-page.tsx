"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import WorkOrderDetailsSkeleton from "@/components/skeleton/work-order/work-order-details-skeleton";
import { workOrderPath, type WorkOrderFrom } from "../work-order-path";
import SiteDetailsCard from "./site-details-card";
import SiteExecution from "./site-execution";
import { SiteOperatorUploadsDialog } from "./site-operator-uploads-dialog";

interface Props {
  workOrderId: string;
  woSiteId: string;
  // Which work order page to go back to.
  from: WorkOrderFrom;
}

// A work order site's own page: its information, estimate and completion,
// then the work carried out there.
const SiteDetailsPage = ({ workOrderId, woSiteId, from }: Props) => {
  const router = useRouter();
  const { setParam } = useHandleParams();
  const id = Number(woSiteId);

  const siteDetailsQuery =
    trpc.workOrderSiteQuery.getWorkOrderSiteDetails.useQuery(
      { work_order_site_id: id },
      { enabled: id > 0 },
    );
  const siteDetails = siteDetailsQuery.data;

  const operatorUploadsQuery =
    trpc.workOrderSiteQuery.getOperatorUploads.useQuery(
      { work_order_site_id: id },
      { enabled: id > 0 },
    );

  const goBack = () => router.push(workOrderPath(workOrderId, from));

  if (siteDetailsQuery.isLoading) return <WorkOrderDetailsSkeleton />;

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
        backClick={goBack}>
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
    siteDetails.work_order.code?.toUpperCase(),
    siteDetails.work_order.title,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <PageWrapper
      title={siteName}
      description={description}
      backClick={goBack}>
      <div className='mt-4 space-y-4'>
        <SiteDetailsCard
          siteDetails={siteDetails}
          operatorUploadsCount={operatorUploadsQuery.data?.length ?? 0}
          onOpenOperatorUploads={() =>
            setParam("site-dialog", "operator-uploads")
          }
        />

        <section className='rounded-lg border border-gray-200 bg-white p-5'>
          <SiteExecution
            woSiteId={siteDetails.id}
            processType={siteDetails.process_type}
          />
        </section>
      </div>

      <SiteOperatorUploadsDialog
        siteName={siteDetails.site.name ?? undefined}
        uploads={operatorUploadsQuery.data ?? []}
        isLoading={operatorUploadsQuery.isLoading}
      />
    </PageWrapper>
  );
};

export default SiteDetailsPage;

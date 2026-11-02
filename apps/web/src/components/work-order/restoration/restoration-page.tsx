"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, File, Plus, Rows3 } from "lucide-react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import useHandleParams from "@/hooks/useHandleParams";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import CustomButton from "@/components/shared/btn";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import WorkOrderDetailsSkeleton from "@/components/skeleton/work-order/work-order-details-skeleton";
import WoSiteOperatorsSection from "../site-details-dialog/wo-site-operators-section";
import { SiteOperatorUploadsDialog } from "../site-details-dialog/site-operator-uploads-dialog";
import SiteExpensesSection from "../site-details-dialog/site-expenses-section";
import JobOrderDialog, { type JobOrder } from "./job-order-dialog";
import JobOrderActions from "./job-order-actions";
import JobOrderCertificates from "./job-order-certificates";
import RestorationMonthlyExpenses from "./restoration-monthly-expenses";
import RestorationSummary from "./restoration-summary";
import RestorationCompletion from "./restoration-completion";
import RestorationRatesSection from "./restoration-rates-section";
import useRestorationRates from "./use-restoration-rates";

const { WO_PROCESS } = constants;

const PANEL = "rounded-lg border border-gray-200 bg-white p-5";

// Kept the same while the work order loads, so the rates aren't worked out
// again on every render.
const NO_RATES: any[] = [];

interface Props {
  workOrderId: string;
  // Which work order page to go back to.
  from: "list" | "client";
}

// The one place restoration work is managed, as it has no sites.
const RestorationPage = ({ workOrderId, from }: Props) => {
  const router = useRouter();
  const { setParam } = useHandleParams();
  const [jobOrderDialogOpen, setJobOrderDialogOpen] = useState(false);
  const [editingJobOrder, setEditingJobOrder] = useState<JobOrder | null>(null);

  const workOrderQuery = trpc.workOrderQuery.getWorkOrderDetails.useQuery(
    { id: Number(workOrderId) },
    { enabled: !!workOrderId },
  );
  const restorationQuery = trpc.restorationQuery.getRestoration.useQuery(
    { work_order_id: Number(workOrderId) },
    { enabled: !!workOrderId },
  );
  const workOrder = workOrderQuery.data?.workOrder;
  const restoration = restorationQuery.data;

  const { rates, estimatedTotal } = useRestorationRates(
    workOrderQuery.data?.scheduleOfRates ?? NO_RATES,
  );

  const operatorUploadsQuery =
    trpc.workOrderSiteQuery.getOperatorUploads.useQuery(
      { work_order_site_id: restoration?.id ?? 0 },
      { enabled: !!restoration },
    );

  const openJobOrderDialog = (jobOrder: JobOrder | null) => {
    setEditingJobOrder(jobOrder);
    setJobOrderDialogOpen(true);
  };

  const goBack = () =>
    router.push(
      from === "client"
        ? `/dashboard/client/workorder/${workOrderId}`
        : `/dashboard/work-order/${workOrderId}`,
    );

  if (workOrderQuery.isLoading || restorationQuery.isLoading) {
    return <WorkOrderDetailsSkeleton />;
  }

  const error = workOrderQuery.error ?? restorationQuery.error;
  if (error) {
    return (
      <Error
        variant='inline'
        message={error.message || "Failed to load restoration"}
      />
    );
  }

  if (!workOrder) {
    return (
      <NoFetchData
        title='Work Order Not Found'
        Icon={File}
        description='The requested work order could not be found.'
      />
    );
  }

  const description = [workOrder.code?.toUpperCase(), workOrder.title]
    .filter(Boolean)
    .join(" - ");

  if (!restoration) {
    const hasRestoration =
      workOrder.process_type === WO_PROCESS.RESTORATION ||
      workOrder.process_type === WO_PROCESS.BIOREMEDIATION_RESTORATION;
    return (
      <PageWrapper
        title='Restoration'
        description={description}
        backClick={goBack}>
        <NoFetchData
          title='No Restoration'
          Icon={File}
          description={
            hasRestoration
              ? "Restoration isn't set up for this work order yet. Set it up from the work order page."
              : "This work order doesn't include restoration."
          }
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title='Restoration'
      description={description}
      backClick={goBack}>
      <div className='mt-4 space-y-4'>
        {/* Set on its own once expenses use up the schedule of rates. */}
        {restoration.is_completed && (
          <div
            role='status'
            className='flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'>
            <CheckCircle2 className='size-4 shrink-0 text-emerald-600' />
            <p>
              <span className='font-semibold'>Restoration complete.</span>{" "}
              Recorded expenses have used up every schedule of rates quantity.
            </p>
          </div>
        )}

        <section className={cn(PANEL, "space-y-4")}>
          <RestorationSummary
            workOrder={workOrder}
            restoration={restoration}
            operatorUploadsCount={operatorUploadsQuery.data?.length ?? 0}
            onOpenOperatorUploads={() =>
              setParam("site-dialog", "operator-uploads")
            }
          />
          <WoSiteOperatorsSection
            woSiteId={restoration.id}
            subject='restoration'
          />
        </section>

        {/* The certificate only comes in once the restoration is complete. */}
        {restoration.is_completed && (
          <RestorationCompletion restoration={restoration} />
        )}

        {rates.length > 0 && (
          <section className={cn(PANEL, "space-y-2")}>
            <div className='flex items-center gap-2'>
              <Rows3 className='size-3.5 text-gray-400' />
              <h2 className='text-[13px] font-semibold text-gray-800'>
                Schedule of rates
              </h2>
              <span className='text-xs text-gray-400'>
                with the quantity expenses have used
              </span>
            </div>
            <RestorationRatesSection
              restorationId={restoration.id}
              rates={rates}
              estimatedTotal={estimatedTotal}
            />
          </section>
        )}

        <RestorationMonthlyExpenses
          restorationId={restoration.id}
          className={PANEL}
        />

        {/* Vendor expenses are recorded on the job order they are spent on. */}
        <section className={PANEL}>
          <SiteExpensesSection
            woSiteId={restoration.id}
            processType={WO_PROCESS.RESTORATION}
            showEstimateTable={false}
            headerActions={
              <CustomButton
                variant='outline'
                Icon={Plus}
                text='New job order'
                onClick={() => openJobOrderDialog(null)}
                className='h-8 text-xs'
                disableForViewer
              />
            }
            jobOrderActions={(jobOrder) => (
              <JobOrderActions
                restorationId={restoration.id}
                jobOrder={jobOrder}
                onEdit={() => openJobOrderDialog(jobOrder)}>
                <JobOrderCertificates
                  restorationId={restoration.id}
                  jobOrder={jobOrder}
                />
              </JobOrderActions>
            )}
          />
        </section>
      </div>

      <JobOrderDialog
        restorationId={restoration.id}
        open={jobOrderDialogOpen}
        onClose={() => setJobOrderDialogOpen(false)}
        editing={editingJobOrder}
      />

      <SiteOperatorUploadsDialog
        siteName='Restoration'
        uploads={operatorUploadsQuery.data ?? []}
        isLoading={operatorUploadsQuery.isLoading}
        parentDialog={null}
      />
    </PageWrapper>
  );
};

export default RestorationPage;

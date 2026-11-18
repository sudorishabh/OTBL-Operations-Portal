"use client";
import React, { useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  File,
  Plus,
} from "lucide-react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { workOrderChildTrail } from "@/lib/breadcrumbs";
import CustomButton from "@/components/shared/btn";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import { RestorationPageSkeleton } from "@/components/skeleton/work-order/site-skeletons";
import { SiteOperatorUploadsDialog } from "../site-details-dialog/site-operator-uploads-dialog";
import SiteExpensesSection from "../site-details-dialog/site-expenses-section";
import type { WorkOrderFrom } from "../work-order-path";
import JobOrderDialog, { type JobOrder } from "./job-order-dialog";
import JobOrderActions from "./job-order-actions";
import JobOrderDocuments from "./job-order-documents";
import RestorationMonthlyExpensesDialog, {
  MONTHLY_EXPENSES_DIALOG,
} from "./restoration-monthly-expenses-dialog";
import RestorationHeader from "./restoration-header";
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
  // Which work order page the trail leads back to.
  from: WorkOrderFrom;
}

// The one place restoration work is managed, as it has no sites.
const RestorationPage = ({ workOrderId, from }: Props) => {
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

  if (workOrderQuery.isLoading || restorationQuery.isLoading) {
    return <RestorationPageSkeleton from={from} />;
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

  const description = [
    workOrder.code,
    workOrder.purchase_order_code &&
      `Purchase order ${workOrder.purchase_order_code}`,
  ]
    .filter(Boolean)
    .join(" - ");
  const breadcrumbs = workOrderChildTrail(
    {
      id: workOrderId,
      code: workOrder.code,
      from,
      client: { id: workOrder.client_id, name: workOrder.client_name },
    },
    "Restoration",
  );

  if (!restoration) {
    const hasRestoration =
      workOrder.process_type === WO_PROCESS.RESTORATION ||
      workOrder.process_type === WO_PROCESS.BIOREMEDIATION_RESTORATION;
    return (
      <PageWrapper
        title='Restoration'
        description={description}
        breadcrumbs={breadcrumbs}>
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
      breadcrumbs={breadcrumbs}>
      <div className='mt-4 space-y-4'>
        {/* Set on its own once completion certificates use up the schedule of
            rates. */}
        {restoration.is_completed && (
          <div
            role='status'
            className='flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'>
            <CheckCircle2 className='size-4 shrink-0 text-emerald-600' />
            <p>
              <span className='font-semibold'>Restoration complete.</span>{" "}
              The job orders&apos; completion certificates have used up every
              schedule of rates quantity.
            </p>
          </div>
        )}

        <RestorationHeader
          workOrder={workOrder}
          restoration={restoration}
          operatorUploadsCount={operatorUploadsQuery.data?.length ?? 0}
          onOpenOperatorUploads={() =>
            setParam("site-dialog", "operator-uploads")
          }
        />

        <div className='flex flex-wrap justify-end gap-2'>
          <CustomButton
            text='View Monthly Expenses'
            variant='outline'
            Icon={CalendarRange}
            onClick={() => setParam("dialog", MONTHLY_EXPENSES_DIALOG)}
          />
        </div>

        {/* The schedule of rates stays in view, as the work is measured
            against it. */}
        {rates.length > 0 && (
          <RestorationRatesSection
            restorationId={restoration.id}
            rates={rates}
            estimatedTotal={estimatedTotal}
            className={PANEL}
          />
        )}

        {/* The certificate only comes in once the restoration is complete. */}
        {restoration.is_completed && (
          <RestorationCompletion restoration={restoration} />
        )}

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
            jobOrderStatus={(jobOrder) => (
              <JobOrderDocuments
                restorationId={restoration.id}
                jobOrder={jobOrder}
                kind='certificates'
              />
            )}
            jobOrderActions={(jobOrder) => (
              <JobOrderActions
                restorationId={restoration.id}
                jobOrder={jobOrder}
                workOrder={workOrder}
                rates={rates}
                onEdit={() => openJobOrderDialog(jobOrder)}
              />
            )}
          />
        </section>
      </div>

      <RestorationMonthlyExpensesDialog restorationId={restoration.id} />

      <JobOrderDialog
        restorationId={restoration.id}
        workOrder={workOrder}
        rates={rates}
        open={jobOrderDialogOpen}
        onClose={() => setJobOrderDialogOpen(false)}
        editing={editingJobOrder}
      />

      <SiteOperatorUploadsDialog
        siteName='Restoration'
        uploads={operatorUploadsQuery.data ?? []}
        isLoading={operatorUploadsQuery.isLoading}
      />
    </PageWrapper>
  );
};

export default RestorationPage;

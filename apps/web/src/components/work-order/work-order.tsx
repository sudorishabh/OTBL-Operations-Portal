"use client";
import React, { useMemo } from "react";
import { PageWrapper } from "@/components/wrapper/page-wrapper";
import { trpc } from "@/lib/trpc";
import { constants, getEffectiveWorkOrderStatus } from "@pkg/utils";
import { useRouter } from "next/navigation";
import WorkOrderDetailsCard from "./work-order-details-card";
import { File, FolderOpen, ReceiptIndianRupee, Rows3 } from "lucide-react";
import ScheduleOfRatesTable from "./schedule-of-rates-table";
import WorkOrderExpensesDialog from "./work-order-expenses-dialog";
import { WorkOrderOperatorUploadsDialog } from "./work-order-operator-uploads-dialog";
import useHandleParams from "@/hooks/useHandleParams";
import CustomButton from "@/components/shared/btn";
import WorkOrderDetailsSkeleton from "../skeleton/work-order/work-order-details-skeleton";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import BioremediationSection from "./work-order-sites/bioremediation-section";
import RestorationSection from "./restoration/restoration-section";

const { WO_PROCESS } = constants;

interface Props {
  workOrderId: string;
  from: "list" | "client";
}

const WorkOrder = ({ workOrderId, from }: Props) => {
  const router = useRouter();
  const { setParam } = useHandleParams();

  const {
    data: workOrderData,
    isLoading: isWorkOrderQueryLoading,
    isError: isWorkOrderQueryError,
    error: workOrderQueryError,
  } = trpc.workOrderQuery.getWorkOrderDetails.useQuery(
    { id: Number(workOrderId) },
    { enabled: !!workOrderId },
  );

  const { data: woOperatorUploads = [] } =
    trpc.workOrderSiteQuery.getOperatorUploadsByWorkOrder.useQuery(
      { work_order_id: Number(workOrderId) },
      { enabled: !!workOrderId },
    );
  const woOperatorUploadsCount = woOperatorUploads.length;

  const workOrder = workOrderData?.workOrder;
  const sites = workOrderData?.sites ?? [];
  const stats = workOrderData?.stats ?? ({} as any);
  const scheduleOfRates = workOrderData?.scheduleOfRates ?? [];

  const derivedWorkOrder = useMemo(() => {
    if (!workOrder) return undefined;
    const effective = getEffectiveWorkOrderStatus(
      workOrder.status,
      scheduleOfRates,
      sites as {
        completions?: {
          activity_name: string;
          estimated_quantity?: unknown;
        }[];
      }[],
    );
    return { ...workOrder, status: effective };
  }, [workOrder, scheduleOfRates, sites]);

  if (isWorkOrderQueryLoading) return <WorkOrderDetailsSkeleton />;

  if (isWorkOrderQueryError)
    return (
      <Error
        variant='inline'
        message={workOrderQueryError.message || "Failed to load work order"}
      />
    );

  if (!workOrderData || !workOrderData.workOrder || !derivedWorkOrder)
    return (
      <NoFetchData
        title='Work Order Not Found'
        Icon={File}
        description='The requested work order could not be found.'
      />
    );

  const totalBudgetAmount =
    (scheduleOfRates || []).reduce(
      (acc: number, curr: any) => acc + Number(curr.total_cost || 0),
      0,
    ) || 0;

  const totalCompletionAmount =
    (sites || []).reduce(
      (acc: number, curr: any) =>
        acc + Number(curr.total_completion_amount || 0),
      0,
    ) || 0;

  const expenseSummary = workOrderData?.work_order_expense_summary;
  const totalExpensesAgg = expenseSummary?.total_expenses ?? 0;

  const statsForComponent = {
    totalSites: stats.total_sites || 0,
    // The restoration row has no site, so it isn't counted as one.
    completedSites:
      (sites || []).filter(
        (s: any) => s.site?.id != null && s.is_completed === true,
      )?.length || 0,
    totalBudgetAmount: totalBudgetAmount,
    totalCompletionAmount: totalCompletionAmount,
    budgetUtilization:
      totalBudgetAmount > 0
        ? (totalCompletionAmount / totalBudgetAmount) * 100
        : 0,
    totalExpenses: totalExpensesAgg,
    expenseEntryCount: expenseSummary?.expense_entry_count ?? 0,
    netSurplus:
      expenseSummary?.net_surplus ?? totalCompletionAmount - totalExpensesAgg,
  };

  // Each process the work order covers gets its own section.
  const processType = derivedWorkOrder.process_type;
  const hasBioremediation =
    processType === WO_PROCESS.BIOREMEDIATION ||
    processType === WO_PROCESS.BIOREMEDIATION_RESTORATION;
  const hasRestoration =
    processType === WO_PROCESS.RESTORATION ||
    processType === WO_PROCESS.BIOREMEDIATION_RESTORATION;

  return (
    <PageWrapper
      title={`${workOrderData.workOrder.code.toUpperCase()} - ${workOrderData.workOrder.title?.toUpperCase() || "Work Order"}`}
      description='Work Order Details and Management'
      backClick={() => {
        if (from === "list") {
          router.push("/dashboard/work-order");
        } else {
          router.push(`/dashboard/client/${workOrderData.workOrder.client_id}`);
        }
      }}>
      <div className='mt-4 space-y-4'>
        <WorkOrderDetailsCard
          workOrder={derivedWorkOrder}
          stats={statsForComponent}
          expenseSummary={expenseSummary}
        />

        {scheduleOfRates.length > 0 && (
          <div className='flex flex-wrap justify-end gap-2'>
            <CustomButton
              text='View Schedule of Rates'
              variant='outline'
              Icon={Rows3}
              onClick={() => setParam("dialog", "schedule-of-rates")}
            />
            <CustomButton
              text='View All Expenses'
              variant='outline'
              Icon={ReceiptIndianRupee}
              onClick={() => setParam("dialog", "all-expenses")}
            />
            {woOperatorUploadsCount > 0 && (
              <CustomButton
                text={`Operator Uploads (${woOperatorUploadsCount})`}
                variant='outline'
                Icon={FolderOpen}
                onClick={() => setParam("dialog", "operator-uploads")}
              />
            )}
          </div>
        )}

        {hasRestoration && (
          <RestorationSection
            workOrder={derivedWorkOrder}
            scheduleOfRates={scheduleOfRates}
          />
        )}

        {hasBioremediation && (
          <BioremediationSection
            workOrder={derivedWorkOrder}
            scheduleOfRates={scheduleOfRates}
          />
        )}

        <ScheduleOfRatesTable
          scheduleOfRates={scheduleOfRates}
          sites={sites}
          expenseSummary={expenseSummary}
        />
        <WorkOrderExpensesDialog
          workOrderId={Number(workOrderId)}
          workOrderCode={workOrderData.workOrder.code}
        />
        <WorkOrderOperatorUploadsDialog
          workOrderId={Number(workOrderId)}
          workOrderCode={workOrderData.workOrder.code}
        />
      </div>
    </PageWrapper>
  );
};

export default WorkOrder;

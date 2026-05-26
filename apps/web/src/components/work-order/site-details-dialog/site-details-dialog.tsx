"use client";
import React from "react";
import DialogWindow from "@/components/shared/dialog-window";
import { trpc } from "@/lib/trpc";
import { capitalFirstLetter } from "@pkg/utils";
import useHandleParams from "@/hooks/useHandleParams";
import SiteDetailsCard from "./site-details-card";
import SiteActivities from "./site-activities";
import SiteExpensesSection from "./site-expenses-section";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { SiteOperatorUploadsDialog } from "./site-operator-uploads-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const CompletionExpenseSummary = ({ woSiteId }: { woSiteId: number }) => {
  const summaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );

  const summary = summaryQuery.data;
  if (summaryQuery.isLoading) return null;
  if (!summary || (summary.grandTotal === 0 && summary.incomeTotal === 0)) return null;

  const { incomeTotal, grandTotal, regularTotal, exceededTotal } = summary;
  const netPL = incomeTotal - grandTotal;

  return (
    <div className='rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden mt-4'>
      <div className='px-4 py-2.5 border-b bg-white flex items-center justify-between'>
        <p className='text-[10px] font-semibold text-slate-500 uppercase tracking-widest'>
          Expense &amp; P&amp;L Summary
        </p>
        <p className='text-[10px] text-slate-400'>Finalised totals for this site</p>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100'>
        {/* Income */}
        <div className='px-4 py-3 bg-white'>
          <div className='flex items-center gap-1.5 mb-1'>
            <TrendingUp className='w-3 h-3 text-emerald-500' />
            <span className='text-[9px] font-semibold text-emerald-600 uppercase tracking-wider'>Income</span>
          </div>
          <p className='text-sm font-bold text-emerald-700'>{formatCurrency(incomeTotal)}</p>
          <p className='text-[9px] text-emerald-500 mt-0.5'>From completion activities</p>
        </div>

        {/* Expenses */}
        <div className='px-4 py-3 bg-white'>
          <div className='flex items-center gap-1.5 mb-1'>
            <TrendingDown className='w-3 h-3 text-gray-500' />
            <span className='text-[9px] font-semibold text-gray-500 uppercase tracking-wider'>Total Expenses</span>
          </div>
          <p className='text-sm font-bold text-gray-800'>{formatCurrency(grandTotal)}</p>
          {(exceededTotal ?? 0) > 0 ? (
            <div className='mt-0.5 space-y-0.5'>
              <p className='text-[9px] text-gray-400'>Regular: {formatCurrency(regularTotal ?? 0)}</p>
              <p className='text-[9px] text-orange-600 font-semibold flex items-center gap-0.5'>
                <AlertTriangle className='w-2.5 h-2.5' />
                Exceeded: {formatCurrency(exceededTotal ?? 0)}
              </p>
            </div>
          ) : (
            <p className='text-[9px] text-gray-400 mt-0.5'>No exceeded expenses</p>
          )}
        </div>

        {/* Net P&L */}
        <div className={`px-4 py-3 ${netPL >= 0 ? "bg-emerald-50/60" : "bg-orange-50/60"}`}>
          <div className='flex items-center gap-1.5 mb-1'>
            <Minus className={`w-3 h-3 ${netPL >= 0 ? "text-emerald-500" : "text-orange-500"}`} />
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${netPL >= 0 ? "text-emerald-600" : "text-orange-600"}`}>
              Net P&amp;L
            </span>
          </div>
          <p className={`text-sm font-bold ${netPL >= 0 ? "text-emerald-700" : "text-orange-700"}`}>
            {formatCurrency(Math.abs(netPL))}
          </p>
          <p className={`text-[9px] mt-0.5 ${netPL >= 0 ? "text-emerald-500" : "text-orange-500"}`}>
            {netPL >= 0 ? "Surplus" : "Deficit"}
            {(exceededTotal ?? 0) > 0 && " (incl. exceeded)"}
          </p>
        </div>
      </div>
    </div>
  );
};

interface SiteDetailDialogProps {
  siteData: {
    id: number;
    wo_site_id: number;
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    start_date: string;
    end_date: string;
    status: "pending" | "completed" | "cancelled";
    client_id?: number;
    work_order_id?: number;
    [key: string]: any;
  } | null;
}

const SiteDetailDialog = () => {
  const { getParam, deleteParams, setParam } = useHandleParams();
  const woSiteId = Number(getParam("wo-site-id"));
  const isOpenDialog = getParam("dialog") === "site-details";
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  const siteDetailsQuery =
    trpc.workOrderSiteQuery.getWorkOrderSiteDetails.useQuery(
      { work_order_site_id: woSiteId ?? 0 },
      { enabled: !!woSiteId && isOpenDialog },
    );

  const siteDetails = siteDetailsQuery.data;

  const dialogTitle = siteDetails?.site?.name
    ? capitalFirstLetter(siteDetails.site.name)
    : "Site Details";

  const dialogDescription = siteDetails?.work_order
    ? `${siteDetails.work_order.code} - ${siteDetails.work_order.title}`
    : undefined;

  const handleCloseDialog = (open: boolean) => {
    if (open) return;
    setIsFullScreen(false);
    deleteParams(["dialog", "wo-site-id", "site-dialog"]);
  };

  const operatorUploadsQuery =
    trpc.workOrderSiteQuery.getOperatorUploads.useQuery(
      { work_order_site_id: woSiteId ?? 0 },
      { enabled: !!woSiteId && isOpenDialog },
    );

  const operatorUploadsCount = operatorUploadsQuery.data?.length ?? 0;

  return (
    <DialogWindow
      open={isOpenDialog}
      setOpen={handleCloseDialog}
      title={dialogTitle}
      description={dialogDescription}
      size='xl'
      isFullScreen={isFullScreen}
      onToggleFullScreen={() => setIsFullScreen((v) => !v)}
      isLoading={siteDetailsQuery.isLoading}>
      <div className='space-y-5 py-3'>
        <SiteDetailsCard
          siteDetails={siteDetails}
          operatorUploadsCount={operatorUploadsCount}
          onOpenOperatorUploads={() =>
            setParam("site-dialog", "operator-uploads")
          }
        />

        <Tabs defaultValue='estimate'>
          <TabsList className='w-full grid grid-cols-3 h-9'>
            <TabsTrigger
              value='estimate'
              className='text-xs'>
              Estimate/sub-WO
            </TabsTrigger>
            <TabsTrigger
              value='expenses'
              className='text-xs'>
              Expenses &amp; P&amp;L
            </TabsTrigger>
            <TabsTrigger
              value='completion'
              className='text-xs'>
              Completion
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='estimate'
            className='mt-4'>
            <SiteActivities
              woSiteId={woSiteId}
              processType={siteDetails?.process_type}
              phase='estimate_sub-wo'
              showPhaseTabs={false}
            />
          </TabsContent>

          <TabsContent
            value='expenses'
            className='mt-4'>
            {woSiteId > 0 && siteDetails?.work_order?.office_id ? (
              <SiteExpensesSection
                woSiteId={woSiteId}
                officeId={siteDetails.work_order.office_id}
                processType={siteDetails?.process_type}
              />
            ) : (
              <div className='text-center py-8 text-gray-400 text-sm'>
                Loading site details...
              </div>
            )}
          </TabsContent>

          <TabsContent
            value='completion'
            className='mt-4'>
            <SiteActivities
              woSiteId={woSiteId}
              processType={siteDetails?.process_type}
              phase='completion'
              showPhaseTabs={false}
            />
            <CompletionExpenseSummary woSiteId={woSiteId} />
          </TabsContent>
        </Tabs>
      </div>

      {isOpenDialog && woSiteId > 0 && (
        <SiteOperatorUploadsDialog
          siteName={siteDetails?.site?.name}
          uploads={operatorUploadsQuery.data ?? []}
          isLoading={operatorUploadsQuery.isLoading}
        />
      )}
    </DialogWindow>
  );
};
  
export default SiteDetailDialog;

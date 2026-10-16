"use client";
import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import WoSiteOperatorsSection from "../site-details-dialog/wo-site-operators-section";
import { SiteOperatorUploadsDialog } from "../site-details-dialog/site-operator-uploads-dialog";
import SiteExpensesSection from "../site-details-dialog/site-expenses-section";
import AddRestorationVendor from "./add-restoration-vendor";
import RemoveRestorationVendor from "./remove-restoration-vendor";
import RestorationSummary from "./restoration-summary";
import RestorationCompletion from "./restoration-completion";
import RestorationRatesSection from "./restoration-rates-section";
import type { RestorationRate } from "./restoration-rates-table";
import type { Restoration } from "./restoration-section";

const { WO_PROCESS } = constants;

interface Props {
  workOrder: any;
  restoration: Restoration;
  rates: RestorationRate[];
  estimatedTotal: number;
}

// The one place restoration work is managed, as it has no sites.
const RestorationDialog = ({
  workOrder,
  restoration,
  rates,
  estimatedTotal,
}: Props) => {
  const { getParam, setParam, deleteParams } = useHandleParams();
  const isOpen = getParam("dialog") === "restoration";
  const [isFullScreen, setIsFullScreen] = useState(false);

  const operatorUploadsQuery =
    trpc.workOrderSiteQuery.getOperatorUploads.useQuery(
      { work_order_site_id: restoration.id },
      { enabled: isOpen },
    );

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    setIsFullScreen(false);
    deleteParams(["dialog", "site-dialog"]);
  };

  return (
    <DialogWindow
      open={isOpen}
      setOpen={handleOpenChange}
      title='Restoration'
      description={`${workOrder.code} - ${workOrder.title}`}
      size='xl'
      isFullScreen={isFullScreen}
      onToggleFullScreen={() => setIsFullScreen((v) => !v)}>
      <div className='space-y-5 py-3'>
        {/* Set on its own once expenses use up the schedule of rates. */}
        {restoration.is_completed && (
          <div
            role='status'
            className='flex items-center gap-2.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800'>
            <CheckCircle2 className='size-4 shrink-0 text-emerald-600' />
            <p>
              <span className='font-semibold'>Restoration complete.</span>{" "}
              Recorded expenses have used up every schedule of rates quantity.
            </p>
          </div>
        )}

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

        {/* The certificate only comes in once the restoration is complete. */}
        {restoration.is_completed && (
          <RestorationCompletion restoration={restoration} />
        )}

        {rates.length > 0 && (
          <RestorationRatesSection
            restorationId={restoration.id}
            rates={rates}
            estimatedTotal={estimatedTotal}
          />
        )}

        <SiteExpensesSection
          woSiteId={restoration.id}
          processType={WO_PROCESS.RESTORATION}
          splitByContractor
          contractors={restoration.contractors}
          showEstimateTable={false}
          headerActions={
            <AddRestorationVendor
              restoration={restoration}
              workOrderId={workOrder.id}
            />
          }
          emptyVendorActions={(vendor) => (
            <RemoveRestorationVendor
              restorationId={restoration.id}
              workOrderId={workOrder.id}
              vendor={vendor}
            />
          )}
        />
      </div>

      {isOpen && (
        <SiteOperatorUploadsDialog
          siteName='Restoration'
          uploads={operatorUploadsQuery.data ?? []}
          isLoading={operatorUploadsQuery.isLoading}
          parentDialog='restoration'
        />
      )}
    </DialogWindow>
  );
};

export default RestorationDialog;

"use client";
import React, { useState } from "react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import SiteActivities from "../site-details-dialog/site-activities";
import WoSiteOperatorsSection from "../site-details-dialog/wo-site-operators-section";
import { SiteOperatorUploadsDialog } from "../site-details-dialog/site-operator-uploads-dialog";
import RestorationSummary from "./restoration-summary";
import RestorationRatesTable, {
  RestorationRate,
} from "./restoration-rates-table";
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

        <Tabs defaultValue='rates'>
          <TabsList className='grid h-9 w-full grid-cols-2'>
            <TabsTrigger
              value='rates'
              className='text-xs'>
              Schedule of Rates
            </TabsTrigger>
            <TabsTrigger
              value='estimate'
              className='text-xs'>
              Estimate/sub-WO
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value='rates'
            className='mt-4'>
            <RestorationRatesTable
              rates={rates}
              estimatedTotal={estimatedTotal}
            />
          </TabsContent>

          <TabsContent
            value='estimate'
            className='mt-4'>
            <SiteActivities
              woSiteId={restoration.id}
              processType={WO_PROCESS.RESTORATION}
              phase='estimate_sub-wo'
              showPhaseTabs={false}
            />
          </TabsContent>
        </Tabs>
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

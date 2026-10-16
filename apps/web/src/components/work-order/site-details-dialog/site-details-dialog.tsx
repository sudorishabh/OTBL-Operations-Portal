"use client";
import React from "react";
import DialogWindow from "@/components/shared/dialog-window";
import { trpc } from "@/lib/trpc";
import { capitalFirstLetter, constants } from "@pkg/utils";
import useHandleParams from "@/hooks/useHandleParams";
import SiteDetailsCard from "./site-details-card";
import SiteActivities from "./site-activities";
import SiteExpensesSection from "./site-expenses-section";
import { BioremediationSections } from "./bioremediation-sections";
import WoSiteOperatorsSection from "./wo-site-operators-section";
import { SiteOperatorUploadsDialog } from "./site-operator-uploads-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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
  const isBioremediation =
    siteDetails?.process_type === constants.WO_PROCESS.BIOREMEDIATION;

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

        {woSiteId > 0 && <WoSiteOperatorsSection woSiteId={woSiteId} />}

        <Tabs defaultValue='estimate'>
          <TabsList className='w-full grid grid-cols-2 h-9'>
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
            {woSiteId > 0 && siteDetails ? (
              <div className='space-y-6'>
                <SiteExpensesSection
                  woSiteId={woSiteId}
                  processType={siteDetails?.process_type}
                />
                {isBioremediation && (
                  <BioremediationSections woSiteId={woSiteId} />
                )}
              </div>
            ) : (
              <div className='text-center py-8 text-gray-400 text-sm'>
                Loading site details...
              </div>
            )}
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

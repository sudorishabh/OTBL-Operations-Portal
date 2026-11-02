"use client";
import React from "react";
import { Calculator, CheckCircle2, Receipt } from "lucide-react";
import { constants } from "@pkg/utils";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobilizationCertificate, ZeroDaySample } from "./site-mobilization";
import SiteSorAvailability from "./site-sor-availability";
import SiteActivities from "./site-activities";
import SiteSorCompletion from "./site-sor-completion";
import { BioremediationSections } from "./bioremediation-sections";
import SiteMeasurementSheets from "./site-measurement-sheets";
import SiteCompletionCertificate from "./site-completion-certificate";

interface Props {
  woSiteId: number;
  processType: string;
  isCompleted: boolean;
  // The site's expenses, rendered by the dialog with its vendor actions.
  execution: React.ReactNode;
}

const sectionClass = "pt-4 border-t border-gray-200/60 first:pt-0 first:border-t-0";

// A site's work in three stages: what it is estimated to take, what is
// spent carrying it out, and how its completion is proven.
const SiteDetailsTabs = ({
  woSiteId,
  processType,
  isCompleted,
  execution,
}: Props) => {
  const isBioremediation = processType === constants.WO_PROCESS.BIOREMEDIATION;

  return (
    <Tabs
      key={woSiteId}
      defaultValue='estimation'
      className='gap-4'>
      <TabsList className='grid w-full sm:w-[420px] grid-cols-3 h-8'>
        <TabsTrigger
          value='estimation'
          className='gap-2 text-xs text-gray-800'>
          <Calculator className='size-3.5 text-gray-500' />
          Estimation
        </TabsTrigger>
        <TabsTrigger
          value='execution'
          className='gap-2 text-xs text-gray-800'>
          <Receipt className='size-3.5 text-gray-500' />
          Execution
        </TabsTrigger>
        <TabsTrigger
          value='completion'
          className='gap-2 text-xs text-gray-800'>
          <CheckCircle2 className='size-3.5 text-gray-500' />
          Completion
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value='estimation'
        className='space-y-4'>
        {/* Mobilization comes first: the team moves on and the baseline
            sample is taken before the estimate. */}
        {isBioremediation && (
          <div
            className={cn(sectionClass, "grid grid-cols-1 gap-5 md:grid-cols-2")}>
            <div className='min-w-0'>
              <MobilizationCertificate woSiteId={woSiteId} />
            </div>
            <div className='min-w-0'>
              <ZeroDaySample woSiteId={woSiteId} />
            </div>
          </div>
        )}
        <SiteSorAvailability
          woSiteId={woSiteId}
          className={sectionClass}
        />
        <div className={sectionClass}>
          <SiteActivities
            woSiteId={woSiteId}
            processType={processType}
          />
        </div>
      </TabsContent>

      <TabsContent value='execution'>{execution}</TabsContent>

      <TabsContent
        value='completion'
        className='space-y-4'>
        {isBioremediation && (
          <>
            <SiteSorCompletion
              woSiteId={woSiteId}
              isCompleted={isCompleted}
            />
            <BioremediationSections woSiteId={woSiteId} />
          </>
        )}
        {/* The certificate is only taken once the site is complete. */}
        <div
          className={cn(
            sectionClass,
            "grid grid-cols-1 gap-5",
            isCompleted && "md:grid-cols-2",
          )}>
          <SiteMeasurementSheets woSiteId={woSiteId} />
          {isCompleted && <SiteCompletionCertificate woSiteId={woSiteId} />}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default SiteDetailsTabs;

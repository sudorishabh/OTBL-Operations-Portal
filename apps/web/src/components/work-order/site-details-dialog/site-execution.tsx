"use client";
import React, { useState } from "react";
import { FlaskConical, ReceiptIndianRupee } from "lucide-react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BioremediationSections } from "./bioremediation-sections";
import SiteExpensesSection from "./site-expenses-section";

const { WO_PROCESS, ZERO_DAY_SAMPLE } = constants;

interface Props {
  woSiteId: number;
  processType: string;
}

type SiteTab = "activities" | "expenses";

// The work carried out at a site and what it cost. A bioremediation site
// shows them as two tabs: its bio samples and oil zapping, then its expenses.
const SiteExecution = ({ woSiteId, processType }: Props) => {
  const isBioremediation = processType === WO_PROCESS.BIOREMEDIATION;
  const [tab, setTab] = useState<SiteTab>("activities");

  // The same queries the tabs make, so their counts come from the cache.
  const bioremediationDataQuery =
    trpc.workOrderSiteQuery.getBioremediationData.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: !!woSiteId && isBioremediation },
    );
  const expensesQuery = trpc.expenseQuery.getExpenses.useQuery(
    { work_order_site_id: woSiteId, page: 1 },
    { enabled: !!woSiteId && isBioremediation },
  );

  if (!isBioremediation) {
    return (
      <SiteExpensesSection
        woSiteId={woSiteId}
        processType={processType}
      />
    );
  }

  // The zero day sample is in the site information card, not this tab.
  const bioremediationData = bioremediationDataQuery.data;
  const activityCount = bioremediationData
    ? bioremediationData.bioSamples.filter(
        (sample: { application_month: string | null }) =>
          sample.application_month !== ZERO_DAY_SAMPLE,
      ).length + bioremediationData.oilZapping.length
    : undefined;
  const expenseCount = expensesQuery.data?.pagination?.total;

  const tabs = [
    {
      value: "activities",
      label: "Bioremediation activities",
      Icon: FlaskConical,
      count: activityCount,
    },
    {
      value: "expenses",
      label: "Expenses",
      Icon: ReceiptIndianRupee,
      count: expenseCount,
    },
  ] as const;

  return (
    <div className='space-y-4'>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as SiteTab)}>
        <TabsList className='h-8'>
          {tabs.map(({ value, label, Icon, count }) => (
            <TabsTrigger
              key={value}
              value={value}
              className='gap-1.5 px-2.5 text-xs text-gray-800'>
              <Icon className='size-3.5 text-gray-500' />
              {label}
              {count !== undefined && (
                <span className='tabular-nums text-gray-400'>{count}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Both stay mounted, so a tab keeps its filters and loaded pages. */}
      <div className={cn(tab !== "activities" && "hidden")}>
        <BioremediationSections woSiteId={woSiteId} />
      </div>
      <div className={cn(tab !== "expenses" && "hidden")}>
        <SiteExpensesSection
          woSiteId={woSiteId}
          processType={processType}
        />
      </div>
    </div>
  );
};

export default SiteExecution;

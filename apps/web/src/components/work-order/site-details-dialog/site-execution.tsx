"use client";
import React from "react";
import { constants } from "@pkg/utils";
import { BioremediationSections } from "./bioremediation-sections";
import SiteExpensesSection from "./site-expenses-section";
import SiteAvailability from "./site-availability";

interface Props {
  woSiteId: number;
  processType: string;
}

const sectionClass = "pt-4 border-t border-gray-200/60 first:pt-0 first:border-t-0";

// What the site can still draw on, the work carried out there, then what it
// cost.
const SiteExecution = ({ woSiteId, processType }: Props) => {
  const isBioremediation = processType === constants.WO_PROCESS.BIOREMEDIATION;

  return (
    <div className='space-y-4'>
      <SiteAvailability
        woSiteId={woSiteId}
        processType={processType}
        className={sectionClass}
      />
      {isBioremediation && (
        <div className={sectionClass}>
          <BioremediationSections woSiteId={woSiteId} />
        </div>
      )}
      {/* A bioremediation site's vendors come from its orders. */}
      <div className={sectionClass}>
        <SiteExpensesSection
          woSiteId={woSiteId}
          processType={processType}
        />
      </div>
    </div>
  );
};

export default SiteExecution;

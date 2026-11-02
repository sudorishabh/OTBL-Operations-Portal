"use client";
import React from "react";
import { constants } from "@pkg/utils";
import { BioremediationSections } from "./bioremediation-sections";

interface Props {
  woSiteId: number;
  processType: string;
  // The site's expenses, shown under its bioremediation activities.
  execution: React.ReactNode;
}

const sectionClass = "pt-4 border-t border-gray-200/60 first:pt-0 first:border-t-0";

// The work carried out at a site, then what it cost.
const SiteDetailsTabs = ({ woSiteId, processType, execution }: Props) => {
  const isBioremediation = processType === constants.WO_PROCESS.BIOREMEDIATION;

  return (
    <div className='space-y-4'>
      {isBioremediation && (
        <div className={sectionClass}>
          <BioremediationSections woSiteId={woSiteId} />
        </div>
      )}
      <div className={sectionClass}>{execution}</div>
    </div>
  );
};

export default SiteDetailsTabs;

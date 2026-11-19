import {
  certifiedQuantityByActivity,
  certifiedQuantityByRow,
  constants,
  toNumberSafe,
} from "@pkg/utils";

const { JOB_ORDER_ACTIVITIES, WO_PROCESS, allActivityOptions } = constants;

// A work order site as the schedule of rates reads it.
export interface SorUsageSite {
  wo_site_id: number;
  process_type?: string | null;
  is_completed?: boolean | null;
  // A bioremediation site's estimate: its share of the schedule of rates.
  estimate?: { quantity: number; amount: number } | null;
}

interface CertifiedJobOrder {
  completion_activities?: { key: string; quantity: string }[] | null;
}

export const isBioremediationActivity = (activity: string) =>
  allActivityOptions.some(
    (option) => option.value === activity && option.isBioremediation,
  );

export const isBioremediationSite = (site: SorUsageSite) =>
  site.process_type === WO_PROCESS.BIOREMEDIATION;

// The work order's restoration, kept as a site with restoration's process.
export const restorationSiteOf = <Site extends SorUsageSite>(sites: Site[]) =>
  sites.find((site) => site.process_type === WO_PROCESS.RESTORATION);

// The soil a bioremediation site has used of the schedule of rates: its
// whole estimate once the site is complete, as its SOR share card shows.
export const siteUsedQuantity = (site: SorUsageSite) =>
  isBioremediationSite(site) && site.is_completed
    ? toNumberSafe(site.estimate?.quantity)
    : 0;

// How much of each schedule of rates activity, and of each transport
// distance slab, the work order has used. Bioremediation uses its complete
// sites' estimates; restoration what its job orders' completion
// certificates certify.
export const sorUsage = (
  sites: SorUsageSite[],
  jobOrders: CertifiedJobOrder[],
) => {
  const bioremediationUsed = sites.reduce(
    (sum, site) => sum + siteUsedQuantity(site),
    0,
  );
  const bioremediationAllotted = sites.reduce(
    (sum, site) =>
      isBioremediationSite(site)
        ? sum + toNumberSafe(site.estimate?.quantity)
        : sum,
    0,
  );
  const certified = certifiedQuantityByActivity(jobOrders);
  const certifiedByRow = certifiedQuantityByRow(jobOrders);

  const used = (activity: string) =>
    isBioremediationActivity(activity)
      ? bioremediationUsed
      : (certified[activity] ?? 0);

  const usedOfSlab = (slabKey: string) => {
    const row = JOB_ORDER_ACTIVITIES.find(
      (activity) => "sorSlab" in activity && activity.sorSlab === slabKey,
    );
    return row ? (certifiedByRow[row.key] ?? 0) : 0;
  };

  return { used, usedOfSlab, bioremediationAllotted };
};

// What the used quantities are worth at the GST inclusive rates.
export const sorUsedValue = (
  scheduleOfRates: { activity: string; unit_rate_inc_gst: unknown }[],
  usage: ReturnType<typeof sorUsage>,
) =>
  scheduleOfRates.reduce(
    (sum, rate) =>
      sum + usage.used(rate.activity) * toNumberSafe(rate.unit_rate_inc_gst),
    0,
  );

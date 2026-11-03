import { isNotNull, sql } from "drizzle-orm";
import { schema } from "@pkg/db";

const { workOrderSiteTable, siteTable } = schema;

// A work order's restoration row is a work order site with no physical site,
// so site lists and counts skip it.
export const hasPhysicalSite = isNotNull(workOrderSiteTable.site_id);

// Where a site name is shown, the restoration row reads "Restoration".
export const siteNameOrRestoration = sql<string>`coalesce(${siteTable.name}, 'Restoration')`;

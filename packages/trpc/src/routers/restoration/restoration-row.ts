import { and, eq } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { constants } from "@pkg/utils";

const { workOrderSiteTable, siteActivityTable, scheduleOfRatesTable } = schema;
const { WO_PROCESS, WORK_ORDER_STATUS, allActivityOptions } = constants;

// Either the database or a transaction on it.
type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

const RESTORATION_ACTIVITIES = new Set<string>(
  allActivityOptions
    .filter((option) => !option.isBioremediation)
    .map((option) => option.value),
);

export const coversRestoration = (processType: string) =>
  processType === WO_PROCESS.RESTORATION ||
  processType === WO_PROCESS.BIOREMEDIATION_RESTORATION;

export const restorationRowWhere = (workOrderId: number) =>
  and(
    eq(workOrderSiteTable.work_order_id, workOrderId),
    eq(workOrderSiteTable.process_type, WO_PROCESS.RESTORATION),
  );

interface RestorationWorkOrder {
  id: number;
  client_id: number;
  start_date: Date;
  end_date: Date;
}

// Creates the work order's one restoration row. It has no site, runs over the
// work order's dates and carries the restoration activities of its schedule
// of rates.
export async function createRestorationRow(
  db: DbOrTx,
  workOrder: RestorationWorkOrder,
): Promise<number> {
  const [result] = await db.insert(workOrderSiteTable).values({
    work_order_id: workOrder.id,
    client_id: workOrder.client_id,
    site_id: null,
    date: workOrder.start_date,
    end_date: workOrder.end_date,
    process_type: WO_PROCESS.RESTORATION,
    status: WORK_ORDER_STATUS.PENDING,
  });
  const restorationId = Number(result.insertId);

  const rates = await db
    .select({
      id: scheduleOfRatesTable.id,
      activity: scheduleOfRatesTable.activity,
      unit: scheduleOfRatesTable.unit,
    })
    .from(scheduleOfRatesTable)
    .where(eq(scheduleOfRatesTable.work_order_id, workOrder.id));

  const activities = rates
    .filter((rate) => RESTORATION_ACTIVITIES.has(rate.activity))
    .map((rate) => ({
      work_order_site_id: restorationId,
      schedule_of_rates_id: rate.id,
      activity: rate.activity,
      unit: rate.unit,
    }));

  if (activities.length > 0) {
    await db.insert(siteActivityTable).values(activities);
  }

  return restorationId;
}

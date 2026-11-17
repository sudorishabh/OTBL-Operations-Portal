import { desc, eq } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { financialYearOf, formatWorkOrderCode } from "@pkg/utils";

const { workOrderTable } = schema;

// Either the database or a transaction on it.
type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// The code a new work order starting on this date gets, such as
// 2025-26(10)OTBL163, and the numbers it is made of. When creating one, pass
// lock inside the transaction: the last numbers are then held until it ends,
// so two work orders created at once can't take the same ones. The unique
// indexes on the numbers catch any that slip through.
export const nextWorkOrderCode = async (
  db: DbOrTx,
  startDate: Date,
  { lock = false }: { lock?: boolean } = {},
) => {
  const financialYear = financialYearOf(startDate);

  const lastOverall = db
    .select({ serial: workOrderTable.serial })
    .from(workOrderTable)
    .orderBy(desc(workOrderTable.serial))
    .limit(1);
  const [overall] = await (lock ? lastOverall.for("update") : lastOverall);

  const lastInYear = db
    .select({ fySerial: workOrderTable.fy_serial })
    .from(workOrderTable)
    .where(eq(workOrderTable.financial_year, financialYear))
    .orderBy(desc(workOrderTable.fy_serial))
    .limit(1);
  const [inYear] = await (lock ? lastInYear.for("update") : lastInYear);

  const parts = {
    financial_year: financialYear,
    fy_serial: (inYear?.fySerial ?? 0) + 1,
    serial: (overall?.serial ?? 0) + 1,
  };

  return {
    ...parts,
    code: formatWorkOrderCode({
      financialYear: parts.financial_year,
      fySerial: parts.fy_serial,
      serial: parts.serial,
    }),
  };
};

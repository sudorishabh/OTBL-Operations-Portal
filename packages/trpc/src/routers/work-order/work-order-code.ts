import { desc, eq } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { financialYearOf, formatWorkOrderCode } from "@pkg/utils";

const { workOrderTable } = schema;

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// The code a new work order starting on this date gets, such as
// 2025-26(10)OTBL163, and the numbers it is made of. Called in the
// transaction that creates the work order, it holds the last numbers until
// then, so two work orders created at once can't take the same ones. The
// unique indexes on the numbers catch any that slip through.
export const nextWorkOrderCode = async (tx: Transaction, startDate: Date) => {
  const financialYear = financialYearOf(startDate);

  const [overall] = await tx
    .select({ serial: workOrderTable.serial })
    .from(workOrderTable)
    .orderBy(desc(workOrderTable.serial))
    .limit(1)
    .for("update");

  const [inYear] = await tx
    .select({ fySerial: workOrderTable.fy_serial })
    .from(workOrderTable)
    .where(eq(workOrderTable.financial_year, financialYear))
    .orderBy(desc(workOrderTable.fy_serial))
    .limit(1)
    .for("update");

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

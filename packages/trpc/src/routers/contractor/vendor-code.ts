import { desc } from "drizzle-orm";
import { schema, type Database } from "@pkg/db";

const { contractorTable } = schema;

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export const formatVendorCode = (serial: number) =>
  `VEN-${String(serial).padStart(4, "0")}`;

// The code the next vendor gets: one after the newest vendor's. Called in
// the transaction that adds the vendor, it holds the newest vendor's row
// until then, so two vendors added at once can't take the same code. The
// unique index on the code catches any that slip through.
export const nextVendorCode = async (tx: Transaction) => {
  const [newest] = await tx
    .select({ code: contractorTable.code })
    .from(contractorTable)
    .orderBy(desc(contractorTable.id))
    .limit(1)
    .for("update");

  const lastSerial = newest ? Number(newest.code.replace(/\D/g, "")) || 0 : 0;
  return formatVendorCode(lastSerial + 1);
};

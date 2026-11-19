import { desc, eq, like, or } from "drizzle-orm";
import type { MySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";
import type { Database } from "@pkg/db";
import { formatCode, typedCode, type CodePrefix } from "@pkg/utils";
import { escapeLike } from "./escape-like";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// A table whose records are known by a code.
type CodedTable = MySqlTable & { id: MySqlColumn; code: MySqlColumn };

// The code the next record gets: one after the newest record's with the same
// prefix, such as USR-0008 after USR-0007, so a table can hold two kinds of
// code. Called in the transaction that adds the record, it holds the newest
// record's row until then, so two records added at once can't take the same
// code. The unique index on the code catches any that slip through.
export const nextCode = async (
  tx: Transaction,
  table: CodedTable,
  prefix: CodePrefix,
) => {
  const [newest] = await tx
    .select({ code: table.code })
    .from(table)
    .where(like(table.code, `${prefix}-%`))
    .orderBy(desc(table.id))
    .limit(1)
    .for("update");

  const lastSerial = newest
    ? Number(String(newest.code).replace(/\D/g, "")) || 0
    : 0;
  return formatCode(prefix, lastSerial + 1);
};

// A search against a code column: part of the code, or the code typed short,
// such as "usr 7" for USR-0007.
export const codeMatches = (
  column: MySqlColumn,
  prefix: CodePrefix,
  search: string,
) => {
  const code = typedCode(prefix, search);
  return or(
    like(column, `%${escapeLike(search.trim())}%`),
    code ? eq(column, code) : undefined,
  );
};

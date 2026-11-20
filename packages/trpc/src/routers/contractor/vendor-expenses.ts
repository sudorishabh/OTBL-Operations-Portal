import { and, eq, gte, like, lt, ne, or, sql, type SQL } from "drizzle-orm";
import type { MySqlSelect } from "drizzle-orm/mysql-core";
import { z } from "zod";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { escapeLike } from "../../helper/escape-like";
import { siteNameOrRestoration } from "../../helper/restoration";

// The expenses recorded under a vendor, as the vendor's page lists, sums and
// narrows them.

const {
  workOrderSiteExpenseTable,
  workOrderSiteTable,
  workOrderTable,
  siteTable,
  jobOrderTable,
  contractOrderItemTable,
  contractOrderTable,
} = schema;
const { CONTRACT_ORDER_TYPE, WO_PROCESS } = constants;

const e = workOrderSiteExpenseTable;

// What an expense was spent on: a purchase order, a sub-contract, a
// restoration job order, or none of them.
export const EXPENSE_SOURCES = [
  "purchase_order",
  "sub_contract",
  "job_order",
  "none",
] as const;
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number];

// The constants are written into the SQL, not bound, so the same expression
// can be selected and grouped by.
const literal = (value: string) => sql.raw(`'${value}'`);

export const expenseSource = sql<ExpenseSource>`(case
  when ${e.job_order_id} is not null then 'job_order'
  when ${contractOrderTable.type} = ${literal(CONTRACT_ORDER_TYPE.PURCHASE_ORDER)} then 'purchase_order'
  when ${contractOrderTable.type} = ${literal(CONTRACT_ORDER_TYPE.SUB_CONTRACT)} then 'sub_contract'
  else 'none' end)`;

// The month an expense starts in, as "2026-04".
export const expenseMonth = sql<string>`date_format(${e.start_date}, '%Y-%m')`;

export const exceededAmount = sql<string>`sum(case when ${e.is_exceeded} <> 0 then ${e.amount} else 0 end)`;

const monthValidator = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Give a month as YYYY-MM");

// How a vendor's expenses are narrowed; each filter is optional.
export const vendorExpenseFilters = {
  id: z.number().positive(),
  // Matches the description, invoice number, order, job order, site or work
  // order.
  search: z.string().trim().max(100).optional(),
  // The first and last month, as "2026-04", an expense may start in.
  from_month: monthValidator.optional(),
  to_month: monthValidator.optional(),
  work_order_id: z.number().int().positive().optional(),
  process: z
    .enum([WO_PROCESS.RESTORATION, WO_PROCESS.BIOREMEDIATION])
    .optional(),
  source: z.enum(EXPENSE_SOURCES).optional(),
  // Only those over the estimate.
  exceeded_only: z.boolean().optional(),
};
type VendorExpenseFilters = {
  id: number;
} & {
  [K in Exclude<keyof typeof vendorExpenseFilters, "id">]?: z.infer<
    (typeof vendorExpenseFilters)[K]
  >;
};

export const VENDOR_EXPENSE_SORTS = [
  "newest",
  "oldest",
  "amount_desc",
  "amount_asc",
] as const;

// A month's first day at midnight, in the server's time zone, as expense
// dates are kept.
const firstDayOf = (month: string) => new Date(`${month}-01T00:00:00`);
const firstDayAfter = (month: string) => {
  const date = firstDayOf(month);
  date.setMonth(date.getMonth() + 1);
  return date;
};

// Joins what an expense is listed and narrowed by: its site and work order,
// and the job order or order requirement it is spent on.
export const withExpensePlaces = <T extends MySqlSelect>(query: T) =>
  query
    .innerJoin(
      workOrderSiteTable,
      eq(e.work_order_site_id, workOrderSiteTable.id),
    )
    .innerJoin(
      workOrderTable,
      eq(workOrderSiteTable.work_order_id, workOrderTable.id),
    )
    .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
    .leftJoin(jobOrderTable, eq(e.job_order_id, jobOrderTable.id))
    .leftJoin(
      contractOrderItemTable,
      eq(e.contract_order_item_id, contractOrderItemTable.id),
    )
    .leftJoin(
      contractOrderTable,
      eq(contractOrderItemTable.contract_order_id, contractOrderTable.id),
    );

// The vendor's expenses in the work orders the user can see; with the
// filters, those they leave. Without its months, the rest of the filters, so
// a timeline can show the months around those picked.
export const vendorExpenseWhere = (
  input: VendorExpenseFilters,
  visible: SQL | undefined,
  { withFilters = true, withMonths = true } = {},
) => {
  const base = and(eq(e.contractor_id, input.id), visible);
  if (!withFilters) return base;

  const term = input.search ? `%${escapeLike(input.search)}%` : null;
  return and(
    base,
    withMonths && input.from_month
      ? gte(e.start_date, firstDayOf(input.from_month))
      : undefined,
    withMonths && input.to_month
      ? lt(e.start_date, firstDayAfter(input.to_month))
      : undefined,
    input.work_order_id
      ? eq(workOrderTable.id, input.work_order_id)
      : undefined,
    input.process
      ? eq(workOrderSiteTable.process_type, input.process)
      : undefined,
    input.source ? sql`${expenseSource} = ${input.source}` : undefined,
    input.exceeded_only ? ne(e.is_exceeded, 0) : undefined,
    term
      ? or(
          like(e.description, term),
          like(e.invoice_number, term),
          like(contractOrderTable.code, term),
          like(jobOrderTable.jo_number, term),
          like(siteNameOrRestoration, term),
          like(workOrderTable.code, term),
        )
      : undefined,
  );
};

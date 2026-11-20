import {
  and,
  eq,
  gte,
  lt,
  ne,
  not,
  sql,
  type SQL,
  type SQLWrapper,
} from "drizzle-orm";
import { z } from "zod";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { getAccessScope, workOrderScopeWhere } from "../../access-scope";
import { sorFullyConsumedSql } from "../work-order/batch-effective-work-order-status";
import { EXPENSE_SOURCES, expenseSource } from "../contractor/vendor-expenses";
import type { TrpcContext } from "../../context";

// What the overview's queries share: the tables they read, the filters its
// dialogs narrow them by, and the conditions both are written with.

const { workOrderTable, workOrderSiteTable, workOrderSiteExpenseTable } =
  schema;
const { WORK_ORDER_STATUS, WO_PROCESS } = constants;

export const wo = workOrderTable;
export const wos = workOrderSiteTable;
export const e = workOrderSiteExpenseTable;

// The work orders the user can see, as a condition on workOrderTable.
export const visibleWorkOrders = async (ctx: TrpcContext) =>
  workOrderScopeWhere(
    await getAccessScope(ctx.db, Number(ctx.user!.sub), ctx.user!.role),
  );

// Work orders that are not cancelled; their sites and rates still count.
export const notCancelled = ne(wo.status, WORK_ORDER_STATUS.CANCELLED);

// Work orders still pending, as the work order list counts them: not those
// whose schedule of rates is used up.
export const stillPending = () =>
  and(eq(wo.status, WORK_ORDER_STATUS.PENDING), not(sorFullyConsumedSql()))!;

// Whether a record's list of uploaded documents has any in it.
export const hasDocuments = (column: SQLWrapper) =>
  sql`coalesce(json_length(${column}), 0) > 0`;

// How many rows meet a condition, inside a grouped or totalled query.
export const countWhere = (condition: SQL) =>
  sql<string>`sum(case when ${condition} then 1 else 0 end)`;

const id = z.number().int().positive();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Give a day as YYYY-MM-DD");

// A day's midnight in the server's time zone, as dates are kept.
const startOfDay = (value: string) => new Date(`${value}T00:00:00`);
const dayAfter = (value: string) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() + 1);
  return date;
};

// Narrows work orders: to an office, a process, or the financial year they
// start in, such as "2025-26".
export const workOrderFilters = {
  office_id: id.optional(),
  process_type: z
    .enum([
      WO_PROCESS.BIOREMEDIATION,
      WO_PROCESS.RESTORATION,
      WO_PROCESS.BIOREMEDIATION_RESTORATION,
    ])
    .optional(),
  financial_year: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
};
export type WorkOrderFilters = {
  [K in keyof typeof workOrderFilters]?: z.infer<(typeof workOrderFilters)[K]>;
};

export const workOrderFilterWhere = (filters: WorkOrderFilters | undefined) =>
  and(
    filters?.office_id ? eq(wo.office_id, filters.office_id) : undefined,
    filters?.process_type
      ? eq(wo.process_type, filters.process_type)
      : undefined,
    filters?.financial_year
      ? eq(wo.financial_year, filters.financial_year)
      : undefined,
  );

// Narrows expenses: to an office, the process of the site they were spent
// at, what they were spent through, and the days they start on (both
// included, either left open).
export const expenseFilters = {
  office_id: id.optional(),
  process: z
    .enum([WO_PROCESS.BIOREMEDIATION, WO_PROCESS.RESTORATION])
    .optional(),
  source: z.enum(EXPENSE_SOURCES).optional(),
  from: day.optional(),
  to: day.optional(),
};
export type ExpenseFilters = {
  [K in keyof typeof expenseFilters]?: z.infer<(typeof expenseFilters)[K]>;
};

// For a query joined by withExpensePlaces. Without its dates, the rest of
// the filters, for a trend that covers its own months.
export const expenseFilterWhere = (
  filters: ExpenseFilters | undefined,
  { withDates = true } = {},
) =>
  and(
    filters?.office_id ? eq(wo.office_id, filters.office_id) : undefined,
    filters?.process ? eq(wos.process_type, filters.process) : undefined,
    filters?.source ? sql`${expenseSource} = ${filters.source}` : undefined,
    withDates && filters?.from
      ? gte(e.start_date, startOfDay(filters.from))
      : undefined,
    withDates && filters?.to
      ? lt(e.start_date, dayAfter(filters.to))
      : undefined,
  );

// A month as "2026-04", as expenseMonth gives it.
export const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

// The last `count` months, this one included, oldest first, in the server's
// time zone.
export const trendMonths = (count: number, now = new Date()) =>
  Array.from({ length: count }, (_, index) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() - (count - 1 - index))),
  );

// A page of a dialog's list.
export const pageInput = (limit: number) => ({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(limit),
});

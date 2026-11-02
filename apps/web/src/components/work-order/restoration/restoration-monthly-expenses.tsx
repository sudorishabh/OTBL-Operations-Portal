"use client";
import React from "react";
import { format } from "date-fns";
import { CalendarRange } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobOrder } from "./job-order-dialog";

interface Props {
  restorationId: number;
  className?: string;
}

type MonthRow = {
  month: string;
  total: number;
  byJobOrder: Record<string, number>;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const headClass =
  "h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap";
const cellClass = "px-3 py-2 text-xs tabular-nums whitespace-nowrap";

// The restoration's expenses month by month, split by job order. Expenses are
// edited in the list below, and these totals follow.
const RestorationMonthlyExpenses = ({ restorationId, className }: Props) => {
  const monthsQuery = trpc.expenseQuery.getMonthlyExpenses.useQuery({
    work_order_site_id: restorationId,
  });
  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery({
    work_order_site_id: restorationId,
  });

  const months = (monthsQuery.data ?? []) as MonthRow[];
  const jobOrders = (jobOrdersQuery.data ?? []) as JobOrder[];
  if (months.length === 0) return null;

  const amountOf = (row: MonthRow, key: string) => row.byJobOrder[key] ?? 0;
  const amountCell = (amount: number) => (
    <TableCell
      className={cn(
        cellClass,
        "text-right",
        amount ? "text-gray-700" : "text-gray-300",
      )}>
      {amount ? formatCurrency(amount) : "—"}
    </TableCell>
  );

  return (
    <section className={cn("space-y-2", className)}>
      <div className='flex items-center gap-2'>
        <CalendarRange className='size-3.5 text-emerald-500' />
        <h4 className='text-[13px] font-semibold text-gray-800'>
          Monthly Expense
        </h4>
        <span className='text-xs text-gray-400'>by the month each expense starts</span>
      </div>
      <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white'>
        <Table>
          <TableHeader>
            <TableRow className='bg-gray-50 hover:bg-gray-50'>
              <TableHead className={headClass}>Month</TableHead>
              {jobOrders.map((jobOrder) => (
                <TableHead
                  key={jobOrder.id}
                  className={cn(headClass, "text-right")}
                  title={jobOrder.title}>
                  {jobOrder.jo_number}
                </TableHead>
              ))}
              <TableHead className={cn(headClass, "text-right")}>
                Miscellaneous
              </TableHead>
              <TableHead className={cn(headClass, "text-right")}>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((row) => (
              <TableRow key={row.month}>
                <TableCell className={cn(cellClass, "font-medium text-gray-800")}>
                  {format(new Date(`${row.month}-01T00:00:00`), "MMM yyyy")}
                </TableCell>
                {jobOrders.map((jobOrder) => (
                  <React.Fragment key={jobOrder.id}>
                    {amountCell(amountOf(row, String(jobOrder.id)))}
                  </React.Fragment>
                ))}
                {amountCell(amountOf(row, "none"))}
                <TableCell
                  className={cn(cellClass, "text-right font-semibold text-gray-900")}>
                  {formatCurrency(row.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

export default RestorationMonthlyExpenses;

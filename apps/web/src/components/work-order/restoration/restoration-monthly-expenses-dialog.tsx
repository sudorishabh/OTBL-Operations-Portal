"use client";
import React from "react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import useHandleParams from "@/hooks/useHandleParams";
import DialogWindow from "@/components/shared/dialog-window";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JobOrder } from "./job-order-dialog";

export const MONTHLY_EXPENSES_DIALOG = "monthly-expenses";

interface Props {
  restorationId: number;
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
// edited in the list on the page, and these totals follow.
const RestorationMonthlyExpensesDialog = ({ restorationId }: Props) => {
  const { getParam, deleteParam } = useHandleParams();
  const isOpen = getParam("dialog") === MONTHLY_EXPENSES_DIALOG;

  const monthsQuery = trpc.expenseQuery.getMonthlyExpenses.useQuery(
    { work_order_site_id: restorationId },
    { enabled: isOpen },
  );
  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery(
    { work_order_site_id: restorationId },
    { enabled: isOpen },
  );

  const months = (monthsQuery.data ?? []) as MonthRow[];
  const jobOrders = (jobOrdersQuery.data ?? []) as JobOrder[];

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
    <DialogWindow
      open={isOpen}
      setOpen={(open) => {
        if (!open) deleteParam("dialog");
      }}
      title='Monthly Expenses'
      description='Restoration expenses by the month each one starts, split by job order.'
      size='lg'
      isLoading={monthsQuery.isLoading}
      loadingSkeleton='list'>
      <div className='py-3'>
        {months.length === 0 ? (
          <p className='py-10 text-center text-sm text-gray-500'>
            No restoration expenses recorded yet.
          </p>
        ) : (
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
        )}
      </div>
    </DialogWindow>
  );
};

export default RestorationMonthlyExpensesDialog;

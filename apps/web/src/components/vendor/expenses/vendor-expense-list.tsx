"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { keepPreviousData } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpDown, Paperclip } from "lucide-react";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { usePageNumber } from "@/hooks/usePageNumber";
import TablePagination, {
  scrollIntoViewIfAbove,
} from "@/components/shared/table-pagination";
import DocumentsMenu from "@/components/shared/documents-menu";
import { SelectFilter } from "@/components/filters/list-filters";
import { toDocuments } from "@/lib/documents";
import { formatDateRange } from "@/lib/wo-site-display";
import {
  formatQuantity,
  itemLabel,
} from "@/components/work-order/contract-orders/contract-order-display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  SORT_OPTIONS,
  formatExactAmount,
  sourceOf,
  toInput,
  type VendorExpense,
  type VendorExpenseSort,
} from "./vendor-expense-filters";

const { allActivityOptions, OIL_ZAPPER } = constants;

const PAGE_SIZE = 25;

const headClass = "h-9 px-3 text-xs font-medium text-gray-500";
const cellClass = "px-3 py-2.5 align-top text-sm text-gray-700";

type ExpensesPage = {
  expenses: VendorExpense[];
  pagination: { total: number };
};

// What an expense was for, as its order requirement or activity names it,
// with the unit its quantity is in.
const spentOn = (expense: VendorExpense) => {
  if (expense.item) {
    return {
      label: itemLabel(expense.item, expense.item_description),
      unit: expense.item_unit,
    };
  }
  if (expense.activity_key === OIL_ZAPPER.KEY) {
    return { label: OIL_ZAPPER.LABEL, unit: OIL_ZAPPER.UNIT };
  }
  const activity = allActivityOptions.find(
    (option) => option.value === expense.activity_key,
  );
  if (activity) return { label: activity.label, unit: activity.unit || null };
  return { label: null, unit: null };
};

// The order or job order an expense is on, by its code.
const placeLabel = (expense: VendorExpense) =>
  expense.order_code ?? expense.jo_number ?? sourceOf(expense.source).label;

interface Props {
  input: ReturnType<typeof toInput>;
  sort: VendorExpenseSort;
  onSortChange: (sort: VendorExpenseSort) => void;
}

// A vendor's expenses as the filters leave them, a numbered page at a time.
// New filters or another sort go back to the first page.
const VendorExpenseList = ({ input, sort, onSortChange }: Props) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = usePageNumber({ ...input, sort });

  // The rows on screen stay, dimmed, while another page or filter loads.
  const { data, isLoading, isPlaceholderData } =
    trpc.contractorQuery.getContractorExpenses.useQuery(
      { ...input, sort, page, limit: PAGE_SIZE },
      { placeholderData: keepPreviousData },
    );
  const result = data as ExpensesPage | undefined;
  const expenses = result?.expenses ?? [];
  const total = result?.pagination.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Back to the last page when this one no longer exists.
  useEffect(() => {
    if (result && !isPlaceholderData && page > lastPage) setPage(lastPage);
  }, [result, isPlaceholderData, page, lastPage, setPage]);

  const goToPage = (next: number) => {
    setPage(next);
    scrollIntoViewIfAbove(listRef.current);
  };

  return (
    <div
      ref={listRef}
      className='scroll-mt-4 space-y-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h4 className='text-sm font-semibold text-gray-800'>All expenses</h4>
        <SelectFilter
          label='Sort expenses'
          Icon={ArrowUpDown}
          value={sort}
          onChange={(value) => onSortChange(value as VendorExpenseSort)}
          options={SORT_OPTIONS}
          defaultValue={null}
          className='w-auto'
        />
      </div>

      {isLoading ? (
        <p className='rounded-lg border border-dashed py-8 text-center text-xs text-gray-400'>
          Loading expenses…
        </p>
      ) : expenses.length === 0 ? (
        <p className='rounded-lg border border-dashed py-8 text-center text-xs text-gray-400'>
          No expenses match these filters.
        </p>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-gray-200 bg-white transition-opacity",
            isPlaceholderData && "opacity-60",
          )}>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50 hover:bg-gray-50'>
                  <TableHead className={headClass}>Date</TableHead>
                  <TableHead className={headClass}>Expense</TableHead>
                  <TableHead className={headClass}>Work order</TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    Quantity
                  </TableHead>
                  <TableHead className={headClass}>Invoice</TableHead>
                  <TableHead className={headClass}>Files</TableHead>
                  <TableHead className={cn(headClass, "text-right")}>
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const { label, unit } = spentOn(expense);
                  const source = sourceOf(expense.source);
                  const documents = toDocuments(expense.documents);
                  return (
                    <TableRow
                      key={expense.id}
                      className={cn(
                        "border-gray-100",
                        expense.is_exceeded && "bg-orange-50/40",
                      )}>
                      <TableCell
                        className={cn(
                          cellClass,
                          "whitespace-nowrap text-xs tabular-nums text-gray-600",
                        )}>
                        {formatDateRange(expense.start_date, expense.end_date)}
                      </TableCell>
                      <TableCell className={cn(cellClass, "min-w-56")}>
                        <p className='font-medium text-gray-900'>
                          {expense.description ?? label ?? "Expense"}
                        </p>
                        <p className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500'>
                          <span className='inline-flex items-center gap-1.5'>
                            <span
                              aria-hidden
                              className='size-2 shrink-0 rounded-sm'
                              style={{ backgroundColor: source.color }}
                            />
                            {/* A code reads in the code face; "Not on an
                              order" doesn't. */}
                            <span
                              className={cn(
                                (expense.order_code || expense.jo_number) &&
                                  "font-mono",
                              )}>
                              {placeLabel(expense)}
                            </span>
                          </span>
                          {expense.description && label && <span>{label}</span>}
                          {expense.from_order && (
                            <span className='text-sky-700'>
                              From the order&apos;s rate
                            </span>
                          )}
                          {expense.is_exceeded && (
                            <span className='inline-flex items-center gap-1 font-medium text-orange-600'>
                              <AlertTriangle className='size-3' />
                              Over the estimate
                            </span>
                          )}
                        </p>
                      </TableCell>
                      <TableCell className={cellClass}>
                        <Link
                          href={`/dashboard/work-order/${expense.work_order_id}`}
                          className='whitespace-nowrap font-mono text-xs font-medium text-emerald-700 hover:underline'>
                          {expense.work_order_code.toUpperCase()}
                        </Link>
                        <p className='mt-0.5 max-w-[14rem] truncate text-xs text-gray-500'>
                          {expense.site_name}
                        </p>
                      </TableCell>
                      <TableCell
                        className={cn(
                          cellClass,
                          "whitespace-nowrap text-right text-xs tabular-nums",
                        )}>
                        {expense.quantity ? (
                          <>
                            <span className='font-medium text-gray-800'>
                              {formatQuantity(Number(expense.quantity))}
                            </span>
                            {unit && (
                              <span className='ml-1 text-gray-400'>{unit}</span>
                            )}
                          </>
                        ) : (
                          <span className='text-gray-300'>—</span>
                        )}
                      </TableCell>
                      <TableCell className={cn(cellClass, "text-xs")}>
                        {expense.invoice_number ?? (
                          <span className='text-gray-300'>—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(cellClass, "whitespace-nowrap text-xs")}>
                        {documents.length > 0 ? (
                          <DocumentsMenu documents={documents}>
                            <button
                              type='button'
                              className='inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-blue-600 transition-colors hover:bg-blue-50'>
                              <Paperclip className='size-3.5' />
                              {documents.length === 1
                                ? "1 file"
                                : `${documents.length} files`}
                            </button>
                          </DocumentsMenu>
                        ) : (
                          <span className='text-gray-300'>—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          cellClass,
                          "whitespace-nowrap text-right font-semibold tabular-nums",
                          expense.is_exceeded
                            ? "text-orange-700"
                            : "text-gray-900",
                        )}>
                        {formatExactAmount(expense.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            noun={total === 1 ? "expense" : "expenses"}
            onPageChange={goToPage}
            className='border-t border-gray-200 bg-gray-50/60'
          />
        </div>
      )}
    </div>
  );
};

export default VendorExpenseList;

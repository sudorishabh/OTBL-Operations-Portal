"use client";
import React, { useMemo, useState } from "react";
import { format, isSameDay } from "date-fns";
import {
  AlertTriangle,
  CalendarRange,
  ChevronRight,
  FileStack,
  HardHat,
  Layers,
  ReceiptIndianRupee,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import DialogWindow from "@/components/shared/dialog-window";
import Error from "@/components/shared/error";
import {
  ALL,
  ClearFiltersButton,
  ComboboxFilter,
  FilterBar,
  SearchFilter,
  SelectFilter,
  type FilterOption,
} from "@/components/filters/list-filters";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  NONE,
  NO_FILTERS,
  activityLabel,
  byMonthAndVendor,
  filterChoices,
  filterExpenses,
  formatCurrency,
  isFiltered,
  monthLabel,
  orderLabel,
  vendorName,
  type MonthlyExpense,
  type MonthlyExpenseFilters,
} from "./vendor-monthly-expenses";

interface Props {
  woSiteId: number;
  /** Restoration's expenses are on job orders; bioremediation's on orders. */
  isRestoration: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const headClass =
  "h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap";
const cellClass = "px-3 py-2 text-xs tabular-nums whitespace-nowrap";
// The month column stays in view while the vendors scroll sideways.
const stickyClass = "sticky left-0 z-10";

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

const formatDays = (start: Date | string, end: Date | string) => {
  const from = new Date(start);
  const to = new Date(end);
  return isSameDay(from, to)
    ? format(from, "d MMM yyyy")
    : `${format(from, "d MMM")} – ${format(to, "d MMM yyyy")}`;
};

// A month's expenses, under its row once it is opened.
const MonthEntries = ({ expenses }: { expenses: MonthlyExpense[] }) => (
  <ul className='divide-y divide-gray-100 rounded-md border border-gray-200 bg-white'>
    {expenses.map((expense) => (
      <li
        key={expense.id}
        className='grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-start gap-x-4 px-3 py-2 text-xs sm:grid-cols-[7.5rem_10rem_minmax(0,1fr)_auto]'>
        <span className='tabular-nums text-gray-500'>
          {formatDays(expense.start_date, expense.end_date)}
        </span>
        <span
          className='hidden truncate font-medium text-gray-800 sm:block'
          title={vendorName(expense)}>
          {vendorName(expense)}
        </span>
        <span className='min-w-0'>
          <span className='block truncate text-gray-800'>
            {expense.description ?? (
              <span className='text-gray-400'>No description</span>
            )}
          </span>
          <span className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-400'>
            <span className='sm:hidden'>{vendorName(expense)}</span>
            <span>{orderLabel(expense)}</span>
            {expense.invoice_number && (
              <span>Invoice {expense.invoice_number}</span>
            )}
            {expense.activity_key && (
              <span>{activityLabel(expense.activity_key)}</span>
            )}
            {expense.from_order && <span>By its purchase order</span>}
            {expense.is_exceeded && (
              <span className='inline-flex items-center gap-1 text-orange-600'>
                <AlertTriangle className='size-3' />
                Over the estimate
              </span>
            )}
          </span>
        </span>
        <span className='text-right font-medium tabular-nums text-gray-900'>
          {formatCurrency(expense.amount)}
        </span>
      </li>
    ))}
  </ul>
);

// What each vendor was paid at a site, month by month, by the month each
// expense starts in. Filters narrow it to a vendor, a span of months, an
// order and more; a month opens to list its expenses.
const VendorMonthlyExpensesDialog = ({
  woSiteId,
  isRestoration,
  open,
  onOpenChange,
}: Props) => {
  const [filters, setFilters] = useState<MonthlyExpenseFilters>(NO_FILTERS);
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  const expensesQuery = trpc.expenseQuery.getVendorMonthlyExpenses.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: open && woSiteId > 0 },
  );
  const allExpenses = useMemo(
    () => (expensesQuery.data ?? []) as MonthlyExpense[],
    [expensesQuery.data],
  );

  const choices = useMemo(() => filterChoices(allExpenses), [allExpenses]);
  const shown = useMemo(
    () => filterExpenses(allExpenses, filters),
    [allExpenses, filters],
  );
  const table = useMemo(() => byMonthAndVendor(shown), [shown]);
  const allTotal = useMemo(
    () => byMonthAndVendor(allExpenses).total,
    [allExpenses],
  );

  const setFilter =
    (key: keyof MonthlyExpenseFilters) =>
    (value: string): void =>
      setFilters((current) => ({ ...current, [key]: value }));

  const toggleMonth = (month: string) =>
    setOpenMonths((current) => {
      const next = new Set(current);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });

  // A range can't end before it starts, so each end offers only the months
  // the other allows.
  const fromOptions: FilterOption[] = [
    { value: ALL, label: "From the first month" },
    ...choices.months
      .filter((month) => filters.to === ALL || month <= filters.to)
      .map((month) => ({ value: month, label: `From ${monthLabel(month)}` })),
  ];
  const toOptions: FilterOption[] = [
    { value: ALL, label: "To the latest month" },
    ...[...choices.months]
      .reverse()
      .filter((month) => filters.from === ALL || month >= filters.from)
      .map((month) => ({ value: month, label: `To ${monthLabel(month)}` })),
  ];
  const activityOptions: FilterOption[] = [
    { value: ALL, label: "All activities" },
    ...choices.activities,
    ...(choices.hasNoActivity ? [{ value: NONE, label: "No activity" }] : []),
  ];

  const renderTable = () => {
    if (expensesQuery.isError) {
      return (
        <Error
          variant='inline'
          message={
            expensesQuery.error.message || "The expenses could not be loaded."
          }
        />
      );
    }
    if (allExpenses.length === 0) {
      return (
        <p className='py-10 text-center text-sm text-gray-500'>
          No expenses recorded yet.
        </p>
      );
    }
    if (shown.length === 0) {
      return (
        <p className='py-10 text-center text-sm text-gray-500'>
          No expenses match these filters.
        </p>
      );
    }

    const { vendors, months } = table;
    const amountCell = (amount: number, key: string) => (
      <TableCell
        key={key}
        className={cn(
          cellClass,
          "text-right",
          amount ? "text-gray-700" : "text-gray-300",
        )}>
        {amount ? formatCurrency(amount) : "—"}
      </TableCell>
    );

    return (
      <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white'>
        <Table>
          <TableHeader>
            <TableRow className='bg-gray-50 hover:bg-gray-50'>
              <TableHead className={cn(headClass, stickyClass, "bg-gray-50")}>
                Month
              </TableHead>
              {vendors.map((vendor) => (
                <TableHead
                  key={vendor.key}
                  className={cn(headClass, "max-w-44 text-right")}
                  title={vendor.name}>
                  <span className='block truncate'>{vendor.name}</span>
                </TableHead>
              ))}
              <TableHead className={cn(headClass, "text-right")}>
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map((row) => {
              const isOpen = openMonths.has(row.month);
              return (
                <React.Fragment key={row.month}>
                  <TableRow
                    className='cursor-pointer'
                    onClick={() => toggleMonth(row.month)}>
                    <TableCell
                      className={cn(
                        cellClass,
                        stickyClass,
                        "bg-white font-medium text-gray-800",
                      )}>
                      <button
                        type='button'
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Hide" : "Show"} the expenses of ${monthLabel(row.month)}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleMonth(row.month);
                        }}
                        className='inline-flex cursor-pointer items-center gap-1.5'>
                        <ChevronRight
                          className={cn(
                            "size-3.5 text-gray-400 transition-transform",
                            isOpen && "rotate-90",
                          )}
                        />
                        {monthLabel(row.month)}
                        <span className='font-normal text-gray-400'>
                          {row.expenses.length}
                        </span>
                      </button>
                    </TableCell>
                    {vendors.map((vendor) =>
                      amountCell(row.byVendor[vendor.key] ?? 0, vendor.key),
                    )}
                    <TableCell
                      className={cn(
                        cellClass,
                        "text-right font-semibold text-gray-900",
                      )}>
                      {formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className='bg-gray-50/70 hover:bg-gray-50/70'>
                      <TableCell
                        colSpan={vendors.length + 2}
                        className='p-2'>
                        <MonthEntries expenses={row.expenses} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
          <TableFooter className='bg-gray-50'>
            <TableRow className='hover:bg-gray-50'>
              <TableCell
                className={cn(
                  cellClass,
                  stickyClass,
                  "bg-gray-50 font-semibold text-gray-900",
                )}>
                Total
              </TableCell>
              {vendors.map((vendor) => (
                <TableCell
                  key={vendor.key}
                  className={cn(
                    cellClass,
                    "text-right font-semibold text-gray-900",
                  )}>
                  {formatCurrency(vendor.total)}
                </TableCell>
              ))}
              <TableCell
                className={cn(
                  cellClass,
                  "text-right font-semibold text-gray-900",
                )}>
                {formatCurrency(table.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    );
  };

  return (
    <DialogWindow
      open={open}
      setOpen={onOpenChange}
      title='Monthly expenses'
      description='What each vendor was paid, month by month, by the month each expense starts in. Open a month to see its expenses.'
      // Nearly the whole screen, so wide tables of vendors fit and the size
      // holds while the filters change.
      size='full'
      heightMode='full'
      isLoading={expensesQuery.isLoading}
      loadingSkeleton='list'>
      <div className='space-y-4 py-3'>
        {allExpenses.length > 0 && (
          <FilterBar>
            <SearchFilter
              label='Search expenses'
              placeholder='Search by description, invoice, vendor or order'
              value={filters.search}
              onChange={setFilter("search")}
            />
            <ComboboxFilter
              label='Vendor'
              allLabel='All vendors'
              Icon={HardHat}
              value={filters.vendor}
              onChange={setFilter("vendor")}
              options={choices.vendors}
              pinnedOptions={
                choices.hasNoVendor ? [{ value: NONE, label: "No vendor" }] : []
              }
              searchPlaceholder='Search vendors'
            />
            <SelectFilter
              label='From month'
              Icon={CalendarRange}
              value={filters.from}
              onChange={setFilter("from")}
              options={fromOptions}
            />
            <SelectFilter
              label='To month'
              Icon={CalendarRange}
              value={filters.to}
              onChange={setFilter("to")}
              options={toOptions}
            />
            {choices.orders.length > 0 && (
              <ComboboxFilter
                label={isRestoration ? "Job order" : "Order"}
                allLabel={isRestoration ? "All job orders" : "All orders"}
                Icon={FileStack}
                value={filters.order}
                onChange={setFilter("order")}
                options={choices.orders}
                pinnedOptions={
                  choices.hasNoOrder
                    ? [{ value: NONE, label: "Miscellaneous" }]
                    : []
                }
                searchPlaceholder={
                  isRestoration ? "Search job orders" : "Search orders"
                }
              />
            )}
            {/* Only worth showing when there are activities to tell apart. */}
            {activityOptions.length > 2 && (
              <SelectFilter
                label='Activity'
                Icon={Layers}
                value={filters.activity}
                onChange={setFilter("activity")}
                options={activityOptions}
              />
            )}
            {choices.hasBothRecorded && (
              <SelectFilter
                label='Recorded'
                Icon={ReceiptIndianRupee}
                value={filters.recorded}
                onChange={setFilter("recorded")}
                options={[
                  { value: ALL, label: "Recorded anywhere" },
                  { value: "order", label: "By purchase orders" },
                  { value: "site", label: "At the site" },
                ]}
              />
            )}
            {choices.hasExceeded && (
              <SelectFilter
                label='Estimate'
                Icon={AlertTriangle}
                value={filters.exceeded}
                onChange={setFilter("exceeded")}
                options={[
                  { value: ALL, label: "Within or over the estimate" },
                  { value: "exceeded", label: "Over the estimate" },
                ]}
              />
            )}
            {isFiltered(filters) && (
              <ClearFiltersButton onClick={() => setFilters(NO_FILTERS)} />
            )}
          </FilterBar>
        )}

        {shown.length > 0 && (
          <p className='text-xs text-gray-500'>
            <span className='font-semibold tabular-nums text-gray-900'>
              {formatCurrency(table.total)}
            </span>{" "}
            across {plural(shown.length, "expense")},{" "}
            {plural(
              table.vendors.filter((vendor) => vendor.key !== NONE).length,
              "vendor",
            )}{" "}
            and {plural(table.months.length, "month")}
            {isFiltered(filters) && <> of {formatCurrency(allTotal)} in all</>}
          </p>
        )}

        {renderTable()}
      </div>
    </DialogWindow>
  );
};

export default VendorMonthlyExpensesDialog;

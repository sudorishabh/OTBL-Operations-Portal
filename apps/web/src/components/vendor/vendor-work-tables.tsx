"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { keepPreviousData } from "@tanstack/react-query";
import { ClipboardList, ShoppingCart, Wrench } from "lucide-react";
import { constants, formatCurrency } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { usePageNumber } from "@/hooks/usePageNumber";
import TablePagination, {
  scrollIntoViewIfAbove,
} from "@/components/shared/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { jobOrderPlace } from "@/components/work-order/restoration/restoration-display";

// The purchase orders, sub-contracts and job orders a vendor is on, each
// table a numbered page at a time.

const { CONTRACT_ORDER_TYPE } = constants;

const PAGE_SIZE = 10;

const headClass = "h-9 px-4 text-xs font-medium text-gray-500";
const cellClass = "px-4 py-2.5 text-sm text-gray-700";

// Rows as getContractorOrders and getContractorJobOrders return them.
type WorkRow = {
  id: number;
  work_order_id: number;
  work_order_code: string;
  spent: number;
  expense_count: number;
};
type ContractOrderRow = WorkRow & {
  type: string;
  code: string;
  order_date: string | Date;
};
type JobOrderRow = WorkRow & {
  jo_number: string;
  installation_name: string | null;
  location: string | null;
  start_date: string | Date;
  end_date: string | Date;
};
type PageOf<K extends string, T> = Record<K, T[]> & {
  pagination: { total: number };
};

const formatDate = (value: string | Date) =>
  format(new Date(value), "dd MMM yyyy");

const WorkOrderLink = ({ id, code }: { id: number; code: string }) => (
  <Link
    href={`/dashboard/work-order/${id}`}
    className='whitespace-nowrap font-mono text-xs font-medium text-emerald-700 hover:underline'>
    {code.toUpperCase()}
  </Link>
);

const Spent = ({ row }: { row: WorkRow }) => (
  <>
    {formatCurrency(row.spent)}
    <span className='ml-1 text-xs text-gray-400'>({row.expense_count})</span>
  </>
);

// A table's page; the table scrolls into view when the page changes from the
// controls under it.
const usePagedTable = (contractorId: number) => {
  const ref = useRef<HTMLElement>(null);
  const [page, setPage] = usePageNumber({ contractorId });
  const goToPage = (next: number) => {
    setPage(next);
    scrollIntoViewIfAbove(ref.current);
  };
  return { ref, page, setPage, goToPage };
};

// Back to the last page when the one shown no longer exists, once its rows
// have come in with the total they tell.
const useBackToLastPage = (
  page: number,
  setPage: (page: number) => void,
  total: number,
  isSettled: boolean,
) => {
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (isSettled && page > lastPage) setPage(lastPage);
  }, [isSettled, page, lastPage, setPage]);
};

// A table's frame: its heading, its rows or why there are none, and the page
// controls under it. The rows stay, dimmed, while another page loads.
const PagedSection = ({
  sectionRef,
  title,
  Icon,
  isLoading,
  isRefreshing,
  emptyText,
  page,
  total,
  noun,
  onPageChange,
  children,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  title: string;
  Icon: React.ElementType;
  isLoading: boolean;
  isRefreshing: boolean;
  emptyText: string;
  page: number;
  total: number;
  noun: [string, string];
  onPageChange: (page: number) => void;
  children: React.ReactNode;
}) => (
  <section
    ref={sectionRef}
    className='scroll-mt-4 space-y-2'>
    <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
      <Icon className='size-4 text-gray-400' />
      {title}
    </h3>
    {isLoading ? (
      <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
        Loading…
      </p>
    ) : total === 0 ? (
      <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
        {emptyText}
      </p>
    ) : (
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-gray-200 bg-white transition-opacity",
          isRefreshing && "opacity-60",
        )}>
        <div className='overflow-x-auto'>{children}</div>
        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          noun={total === 1 ? noun[0] : noun[1]}
          onPageChange={onPageChange}
          className='border-t border-gray-200 bg-gray-50/60'
        />
      </div>
    )}
  </section>
);

export const VendorOrdersTable = ({
  contractorId,
}: {
  contractorId: number;
}) => {
  const { ref, page, setPage, goToPage } = usePagedTable(contractorId);
  const query = trpc.contractorQuery.getContractorOrders.useQuery(
    { id: contractorId, page, limit: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );
  const data = query.data as PageOf<"orders", ContractOrderRow> | undefined;
  const total = data?.pagination.total ?? 0;
  useBackToLastPage(page, setPage, total, !!data && !query.isPlaceholderData);

  return (
    <PagedSection
      sectionRef={ref}
      title='Purchase Orders & Sub-contracts'
      Icon={ShoppingCart}
      isLoading={query.isLoading}
      isRefreshing={query.isPlaceholderData}
      emptyText='Not on any purchase order or sub-contract yet.'
      page={page}
      total={total}
      noun={["order", "orders"]}
      onPageChange={goToPage}>
      <Table>
        <TableHeader>
          <TableRow className='bg-gray-50 hover:bg-gray-50'>
            <TableHead className={headClass}>Order</TableHead>
            <TableHead className={headClass}>Type</TableHead>
            <TableHead className={headClass}>Date</TableHead>
            <TableHead className={headClass}>Work order</TableHead>
            <TableHead className={cn(headClass, "text-right")}>Spent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.orders ?? []).map((order) => {
            const isPurchase =
              order.type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER;
            return (
              <TableRow key={order.id}>
                <TableCell className={cn(cellClass, "font-mono font-medium")}>
                  {order.code}
                </TableCell>
                <TableCell className={cellClass}>
                  <span className='inline-flex items-center gap-1.5 text-xs'>
                    {isPurchase ? (
                      <ShoppingCart className='size-3.5 text-gray-400' />
                    ) : (
                      <Wrench className='size-3.5 text-gray-400' />
                    )}
                    {isPurchase ? "Purchase order" : "Sub-contract"}
                  </span>
                </TableCell>
                <TableCell className={cn(cellClass, "text-xs")}>
                  {formatDate(order.order_date)}
                </TableCell>
                <TableCell className={cellClass}>
                  <WorkOrderLink
                    id={order.work_order_id}
                    code={order.work_order_code}
                  />
                </TableCell>
                <TableCell className={cn(cellClass, "text-right tabular-nums")}>
                  <Spent row={order} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PagedSection>
  );
};

export const VendorJobOrdersTable = ({
  contractorId,
}: {
  contractorId: number;
}) => {
  const { ref, page, setPage, goToPage } = usePagedTable(contractorId);
  const query = trpc.contractorQuery.getContractorJobOrders.useQuery(
    { id: contractorId, page, limit: PAGE_SIZE },
    { placeholderData: keepPreviousData },
  );
  const data = query.data as PageOf<"jobOrders", JobOrderRow> | undefined;
  const total = data?.pagination.total ?? 0;
  useBackToLastPage(page, setPage, total, !!data && !query.isPlaceholderData);

  return (
    <PagedSection
      sectionRef={ref}
      title='Restoration Job Orders'
      Icon={ClipboardList}
      isLoading={query.isLoading}
      isRefreshing={query.isPlaceholderData}
      emptyText='Not on any job order yet.'
      page={page}
      total={total}
      noun={["job order", "job orders"]}
      onPageChange={goToPage}>
      <Table>
        <TableHeader>
          <TableRow className='bg-gray-50 hover:bg-gray-50'>
            <TableHead className={headClass}>Job order</TableHead>
            <TableHead className={headClass}>Dates</TableHead>
            <TableHead className={headClass}>Work order</TableHead>
            <TableHead className={cn(headClass, "text-right")}>Spent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data?.jobOrders ?? []).map((jobOrder) => (
            <TableRow key={jobOrder.id}>
              <TableCell className={cellClass}>
                <span className='font-mono font-medium'>
                  {jobOrder.jo_number}
                </span>
                <span className='ml-2 text-gray-500'>
                  {jobOrderPlace(jobOrder)}
                </span>
              </TableCell>
              <TableCell className={cn(cellClass, "whitespace-nowrap text-xs")}>
                {formatDate(jobOrder.start_date)} –{" "}
                {formatDate(jobOrder.end_date)}
              </TableCell>
              <TableCell className={cellClass}>
                <WorkOrderLink
                  id={jobOrder.work_order_id}
                  code={jobOrder.work_order_code}
                />
              </TableCell>
              <TableCell className={cn(cellClass, "text-right tabular-nums")}>
                <Spent row={jobOrder} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PagedSection>
  );
};

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { keepPreviousData } from "@tanstack/react-query";
import { ArrowUpDown, ChevronRight } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import {
  ALL,
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import { Pill, STATUS_STYLES } from "@/components/shared/detail-card-parts";
import Error from "@/components/shared/error";
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
import { OfficeWorkOrdersTableSkeleton } from "@/components/skeleton/office-site/office-page-skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageNumber } from "@/hooks/usePageNumber";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type {
  IWorkOrder,
  IWorkOrderPagination,
} from "@/types/work-order.types";
import type { OfficeDetails } from "./office-types";

const PAGE_SIZE = 10;

type WorkOrdersPage = {
  workOrders: IWorkOrder[];
  pagination: IWorkOrderPagination;
};

const STATUS_OPTIONS = [
  { label: "All statuses", value: ALL },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const SORT_OPTIONS = [
  { label: "Newest first", value: "latest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Ending soonest", value: "ending_soonest" },
  { label: "Title A–Z", value: "asc" },
  { label: "Title Z–A", value: "desc" },
];

const HEAD_CLASS = "h-9 px-4 text-xs font-medium text-gray-500";
const CELL_CLASS = "px-4 py-2.5 text-sm text-gray-700";

const formatDate = (value: string | Date) =>
  format(new Date(value), "dd MMM yyyy");

// The office's work orders, searchable and a page at a time, each linking
// to the work order and its client.
const OfficeWorkOrders = ({ details }: { details: OfficeDetails }) => {
  const { office, workOrders: counts } = details;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [order, setOrder] = useState("latest");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const isFiltered = search !== "" || status !== ALL;

  const [page, setPage] = usePageNumber({
    status,
    order,
    search: debouncedSearch,
  });
  const listRef = useRef<HTMLDivElement>(null);

  // The rows on screen stay while another page or filter loads.
  const { data, isLoading, isPlaceholderData, error } =
    trpc.workOrderQuery.getAll.useQuery(
      {
        office_id: office.id,
        page,
        limit: PAGE_SIZE,
        searchQuery: debouncedSearch || undefined,
        status,
        workOrderOrder: order,
      },
      { placeholderData: keepPreviousData },
    );
  const result = data as WorkOrdersPage | undefined;
  const workOrders = result?.workOrders ?? [];
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

  const renderList = () => {
    if (isLoading) return <OfficeWorkOrdersTableSkeleton />;

    if (!result) {
      return (
        <Error
          variant='inline'
          message={error?.message ?? "The work orders could not be loaded."}
        />
      );
    }

    if (workOrders.length === 0) {
      return (
        <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
          {isFiltered
            ? "No work orders match these filters."
            : "This office has no work orders yet."}
        </p>
      );
    }

    return (
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-gray-200 transition-opacity",
          isPlaceholderData && "pointer-events-none opacity-60",
        )}>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 hover:bg-gray-50'>
                <TableHead className={HEAD_CLASS}>Work order</TableHead>
                <TableHead className={HEAD_CLASS}>Client</TableHead>
                <TableHead className={HEAD_CLASS}>Period</TableHead>
                <TableHead className={HEAD_CLASS}>Status</TableHead>
                <TableHead className={cn(HEAD_CLASS, "w-10")}>
                  <span className='sr-only'>Open</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((workOrder) => (
                <TableRow
                  key={workOrder.id}
                  className='group'>
                  <TableCell className={cn(CELL_CLASS, "max-w-md")}>
                    <Link
                      href={`/dashboard/work-order/${workOrder.id}`}
                      title={workOrder.title}
                      className='block truncate font-medium text-gray-900 hover:text-emerald-700 hover:underline'>
                      {capitalFirstLetter(workOrder.title)}
                    </Link>
                    <p className='truncate font-mono text-xs text-gray-500'>
                      {workOrder.code.toUpperCase()}
                      {workOrder.agreement_number && (
                        <span className='font-sans text-gray-400'>
                          {" · Agreement "}
                          {workOrder.agreement_number.toUpperCase()}
                        </span>
                      )}
                    </p>
                  </TableCell>
                  <TableCell className={cn(CELL_CLASS, "max-w-56")}>
                    {workOrder.client_name ? (
                      <Link
                        href={`/dashboard/client/${workOrder.client_id}`}
                        title={workOrder.client_name}
                        className='block truncate hover:text-emerald-700 hover:underline'>
                        {workOrder.client_name.toUpperCase()}
                      </Link>
                    ) : (
                      <span className='text-gray-300'>&mdash;</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn(CELL_CLASS, "whitespace-nowrap text-xs")}>
                    {formatDate(workOrder.start_date)} –{" "}
                    {formatDate(workOrder.end_date)}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <Pill className={STATUS_STYLES[workOrder.status]}>
                      {capitalFirstLetter(workOrder.status)}
                    </Pill>
                  </TableCell>
                  <TableCell className={cn(CELL_CLASS, "pr-3")}>
                    <Link
                      href={`/dashboard/work-order/${workOrder.id}`}
                      aria-label={`Open work order ${workOrder.code}`}
                      className='flex size-7 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-gray-100 hover:text-emerald-700 group-hover:text-emerald-600'>
                      <ChevronRight className='size-4' />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          noun={total === 1 ? "work order" : "work orders"}
          onPageChange={goToPage}
          className='border-t border-gray-200 bg-gray-50/60'
        />
      </div>
    );
  };

  return (
    <div
      ref={listRef}
      className='scroll-mt-4'>
      {counts.total > 0 && (
        <FilterBar className='mb-3'>
          <SearchFilter
            label='Search work orders'
            placeholder='Search by code, title, agreement or client...'
            value={search}
            onChange={setSearch}
          />
          <SelectFilter
            label='Work order status'
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
          />
          <SelectFilter
            label='Sort work orders'
            Icon={ArrowUpDown}
            value={order}
            onChange={setOrder}
            options={SORT_OPTIONS}
            defaultValue={null}
          />
          {isFiltered && (
            <ClearFiltersButton
              onClick={() => {
                setSearch("");
                setStatus(ALL);
              }}
            />
          )}
        </FilterBar>
      )}

      {renderList()}
    </div>
  );
};

export default OfficeWorkOrders;

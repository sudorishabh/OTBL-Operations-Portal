import React, { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { UseQueryResult } from "@tanstack/react-query";
import { ArrowUpDown, ChevronRight, ClipboardList } from "lucide-react";
import { capitalFirstLetter } from "@pkg/utils";
import ProcessSectionHeader from "@/components/work-order/process-section-header";
import {
  ALL,
  ClearFiltersButton,
  FilterBar,
  SearchFilter,
  SelectFilter,
} from "@/components/filters/list-filters";
import { Pill, STATUS_STYLES } from "@/components/shared/detail-card-parts";
import Error from "@/components/shared/error";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import PaginationSummary from "@/components/shared/pagination-summary";
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
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
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

// The office's work orders, newest first, a page at a time.
const OfficeWorkOrders = ({ details }: { details: OfficeDetails }) => {
  const { office, workOrders: counts } = details;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [order, setOrder] = useState("latest");
  const debouncedSearch = useDebounce(search.trim(), 300);
  const isFiltered = search !== "" || status !== ALL;

  const queryInput = {
    office_id: office.id,
    limit: PAGE_SIZE,
    searchQuery: debouncedSearch || undefined,
    status,
    workOrderOrder: order,
  };
  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<WorkOrdersPage>[] = trpc.useQueries(
    (t: any) =>
      pages.map((page) => t.workOrderQuery.getAll({ ...queryInput, page })),
  );

  const workOrders = pageQueries.flatMap(
    (query) => query.data?.workOrders ?? [],
  );
  const pagination = pageQueries
    .flatMap((query) => query.data?.pagination ?? [])
    .at(-1);
  const failedQuery = pageQueries.find((query) => query.isError);
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;

  const renderList = () => {
    if (pageQueries[0]?.isLoading) return <OfficeWorkOrdersTableSkeleton />;

    if (failedQuery?.error) {
      return (
        <Error
          variant='inline'
          message={failedQuery.error.message}
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
      <div className='overflow-hidden rounded-lg border border-gray-200'>
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

        {pagination?.hasMore && (
          <div className='border-t border-gray-100 py-2 text-center'>
            <LoadMoreBtn
              onClick={loadMore}
              loading={isFetchingMore}
            />
          </div>
        )}

        <PaginationSummary
          shown={workOrders.length}
          total={pagination?.total}
          page={pagination?.page}
          totalPages={pagination?.totalPages}
          noun='work orders'
          className='border-t border-gray-200 bg-gray-50/60'
        />
      </div>
    );
  };

  return (
    <section className='rounded-lg border bg-white p-4 sm:p-6'>
      <ProcessSectionHeader
        Icon={ClipboardList}
        title='Work orders'
        description={
          counts.total === 0
            ? "Work orders run from this office"
            : `${counts.total} ${counts.total === 1 ? "work order" : "work orders"} run from this office`
        }
      />

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
    </section>
  );
};

export default OfficeWorkOrders;

"use client";
import React from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import WorkOrderTable from "./work-order-table";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import { useWorkOrderManagementContext } from "@/contexts/WorkOrderManagementContext";
import WorkOrderSearchNFilter from "./work-order-search-filter";
import { IWorkOrder, IWorkOrderPagination } from "@/types/work-order.types";
import { WorkOrdersTableSkeleton } from "../skeleton/work-orders/work-orders-skeleton";
import Error from "@/components/shared/error";
import NoFetchData from "@/components/shared/no-fetch-data";
import ScrollToTop from "@/components/scroll-to-top";

const PAGE_SIZE = 40;

type WorkOrdersPage = {
  workOrders: IWorkOrder[];
  pagination: IWorkOrderPagination;
};

const WorkOrderPage = () => {
  const { searchQuery, filters, workOrderOrder } =
    useWorkOrderManagementContext();
  const debouncedSearch = useDebounce(searchQuery.trim(), 300);

  const queryInput = {
    limit: PAGE_SIZE,
    searchQuery: debouncedSearch || undefined,
    status: filters.status,
    office_id: filters.office_id,
    client_id: filters.client_id,
    process_type: filters.process_type,
    workOrderOrder,
  };

  const { pages, loadMore } = useLoadMorePages(queryInput);

  const pageQueries: UseQueryResult<WorkOrdersPage>[] = trpc.useQueries(
    (t: any) =>
      pages.map((page) => t.workOrderQuery.getAll({ ...queryInput, page })),
  );

  const workOrders = pageQueries.flatMap(
    (query) => query.data?.workOrders ?? [],
  );
  const pagination =
    pageQueries.flatMap((query) => query.data?.pagination ?? []).at(-1) ?? null;
  const failedQuery = pageQueries.find((query) => query.isError);
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;

  const isFiltered =
    !!debouncedSearch ||
    filters.status !== "all" ||
    filters.office_id !== undefined ||
    filters.client_id !== undefined ||
    filters.process_type !== undefined;

  const renderList = () => {
    if (pageQueries[0]?.isLoading) {
      return <WorkOrdersTableSkeleton />;
    }

    if (failedQuery?.error) {
      return (
        <Error
          variant='default'
          message={failedQuery.error.message}
        />
      );
    }

    if (workOrders.length === 0) {
      return (
        <NoFetchData
          Icon={ClipboardList}
          title={isFiltered ? "No matching work orders" : "No work orders yet"}
          description={
            isFiltered
              ? "Try another search or clear the filters."
              : "Work orders appear here once they are created from a client's proposal."
          }
        />
      );
    }

    return (
      <WorkOrderTable
        workOrders={workOrders}
        pagination={pagination}
        handleLoadMore={loadMore}
        isLoadingData={isFetchingMore}
      />
    );
  };

  return (
    <div>
      <div className='w-full mt-8'>
        <div className='mb-4'>
          <WorkOrderSearchNFilter />
        </div>

        {renderList()}
      </div>
      <ScrollToTop />
    </div>
  );
};

export default WorkOrderPage;

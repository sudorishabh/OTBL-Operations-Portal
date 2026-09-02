"use client";
import React, { useState, useEffect } from "react";
import WorkOrderTable from "./work-order-table";
import { trpc } from "@/lib/trpc";
import { useWorkOrderManagementContext } from "@/contexts/WorkOrderManagementContext";
import WorkOrderSearchNFilter from "./work-order-search-filter";
import { IWorkOrder } from "@/types/work-order.types";
import WorkOrdersSkeleton from "../skeleton/work-orders/work-orders-skeleton";
import ScrollToTop from "@/components/scroll-to-top";

const WorkOrderPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [allWorkOrdersList, setAllWorkOrdersList] = useState<IWorkOrder[]>([]);

  const { searchQuery, filters, workOrderOrder } =
    useWorkOrderManagementContext();

  const allWorkOrdersQueryLimit = 40;
  const getAllWorkOrdersQuery = trpc.workOrderQuery.getAll.useQuery({
    page: currentPage,
    limit: allWorkOrdersQueryLimit,
    searchQuery: searchQuery || undefined,
    status: filters.status,
    office_id: filters.office_id,
    workOrderOrder,
  });

  const isAllWorkOrderQueryLoading = getAllWorkOrdersQuery.isLoading;
  const { workOrders, pagination } = getAllWorkOrdersQuery?.data || {
    workOrders: [],
    pagination: null,
  };

  const isInitialLoading =
    isAllWorkOrderQueryLoading &&
    currentPage === 1 &&
    searchQuery === "" &&
    filters.status === "all" &&
    filters.office_id === undefined &&
    workOrderOrder === "latest";

  const isFetchingMore = getAllWorkOrdersQuery.isFetching && currentPage > 1;

  useEffect(() => {
    setCurrentPage(1);
    setAllWorkOrdersList([]);
  }, [searchQuery, filters.status, filters.office_id]);

  useEffect(() => {
    if (!workOrders || isAllWorkOrderQueryLoading) return;
    if (pagination?.page !== currentPage) return;

    if (currentPage === 1) {
      setAllWorkOrdersList(workOrders);
    } else {
      setAllWorkOrdersList((prev) => [...prev, ...workOrders]);
    }
  }, [workOrders, currentPage, isAllWorkOrderQueryLoading]);

  const handleLoadMore = () => {
    setCurrentPage((prev) => prev + 1);
  };

  return (
    <div>
      {isInitialLoading ? (
        <WorkOrdersSkeleton />
      ) : (
        <div className='w-full mt-8'>
          <div className='mb-4'>
            <WorkOrderSearchNFilter />
          </div>

          <WorkOrderTable
            workOrders={allWorkOrdersList}
            pagination={pagination}
            handleLoadMore={handleLoadMore}
            isLoadingData={isFetchingMore}
          />
        </div>
      )}
      <ScrollToTop />
    </div>
  );
};

export default WorkOrderPage;

"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FileText,
  MapPin,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Wrench,
} from "lucide-react";
import toast from "react-hot-toast";
import { constants } from "@pkg/utils";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useApiError } from "@/hooks/useApiError";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import { ALL, type FilterOption } from "@/components/filters/list-filters";
import { useIsViewer } from "@/contexts/AuthContext";
import { toDocuments } from "@/lib/documents";
import CustomButton from "@/components/shared/btn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DocumentsMenu from "@/components/shared/documents-menu";
import ContractOrderDialog from "./contract-order-dialog";
import ContractOrderDetailsDialog from "./contract-order-details-dialog";
import ContractOrderFilterBar from "./contract-order-filter-bar";
import {
  NO_ORDER_FILTERS,
  hasOrderFilters,
  type OrderFilters,
  type OrderSort,
  type OrderType,
} from "./contract-order-filters";
import {
  ORDER_TYPES,
  formatAmount,
  itemLabel,
  orderTypeOf,
  purchaseOrderCost,
  requirementTerms,
  requirementsBySite,
  type ContractOrder,
} from "./contract-order-display";
import OrderCompletionDocuments from "./order-completion-documents";
import ContractOrdersSkeleton from "@/components/skeleton/work-order/contract-orders-skeleton";

const { OIL_ZAPPER } = constants;

const PAGE_SIZE = 20;

type OrdersPage = RouterOutputs["contractOrderQuery"]["getContractOrders"];

// A site or vendor the orders name, as a filter choice.
const toChoice = (row: {
  id: number;
  name: string | null;
  code: string | null;
}): FilterOption => ({
  value: String(row.id),
  label: row.name ?? "Site",
  hint: row.code ?? undefined,
});

interface Props {
  workOrderId: number;
  // Lays out the section's actions and its table, such as in a tab.
  children: (parts: {
    actions: React.ReactNode;
    table: React.ReactNode;
    count: number;
  }) => React.ReactNode;
}

// Tighter than the table defaults, at every screen size.
const headClass = "h-9 px-3 sm:h-9 sm:px-3 text-xs font-medium text-gray-500";
const cellClass = "px-3 py-3 sm:px-3 sm:py-3";

// The purchase orders and sub-contracts bioremediation work is given out
// through. One order can require things at several of the work order's sites.
const ContractOrdersSection = ({ workOrderId, children }: Props) => {
  const isViewer = useIsViewer();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractOrder | null>(null);
  // The order whose details are open, and the one to go back to once its
  // edit form closes, when it was opened from them.
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [returnToId, setReturnToId] = useState<number | null>(null);
  const [filters, setFilters] = useState<OrderFilters>(NO_ORDER_FILTERS);
  const [sort, setSort] = useState<OrderSort>("newest");

  // The server filters, counts, totals and pages the orders.
  const debouncedSearch = useDebounce(filters.search.trim(), 300);
  const queryInput = {
    work_order_id: workOrderId,
    limit: PAGE_SIZE,
    type: filters.type === ALL ? undefined : filters.type,
    search: debouncedSearch || undefined,
    work_order_site_id: filters.site === ALL ? undefined : Number(filters.site),
    vendor_id: filters.vendor === ALL ? undefined : Number(filters.vendor),
    completion: filters.completion === ALL ? undefined : filters.completion,
    from: filters.from,
    to: filters.to,
    sort,
  };
  const { pages, loadMore } = useLoadMorePages(queryInput);

  // Each page is its own query, so adding, editing or completing an order
  // refreshes the loaded pages in place. A new filter keeps the last orders
  // in view until its first page arrives.
  const pageQueries: UseQueryResult<OrdersPage>[] = trpc.useQueries((t: any) =>
    pages.map((page) =>
      t.contractOrderQuery.getContractOrders(
        { ...queryInput, page },
        { placeholderData: page === 1 ? keepPreviousData : undefined },
      ),
    ),
  );
  const firstPage = pageQueries[0]?.data;
  const lastPage = pageQueries.at(-1)?.data;
  const shownOrders = pageQueries.flatMap(
    (query) => (query.data?.orders ?? []) as ContractOrder[],
  );
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;
  // Every order of the work order, and those the filters leave.
  const totalOrders = firstPage?.total_orders ?? 0;
  const shownTotal = firstPage?.pagination.total ?? 0;

  const deleteOrder =
    trpc.contractOrderMutation.deleteContractOrder.useMutation({
      onSuccess: async () => {
        toast.success("Order deleted");
        await Promise.all([
          utils.contractOrderQuery.getContractOrders.invalidate({
            work_order_id: workOrderId,
          }),
          utils.contractOrderQuery.getSiteContractOrderItems.invalidate(),
        ]);
      },
      onError: (error: unknown) => handleError(error, { showToast: true }),
    });

  const openDialog = (order: ContractOrder | null) => {
    setEditing(order);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    if (returnToId) setDetailsId(returnToId);
    setReturnToId(null);
  };

  const typeCounts: Record<OrderType, number> = {
    [ALL]: firstPage?.counts.all ?? 0,
    purchase_order: firstPage?.counts.purchase_order ?? 0,
    sub_contract: firstPage?.counts.sub_contract ?? 0,
  };
  const choices = {
    sites: (firstPage?.sites ?? []).map(toChoice),
    vendors: (firstPage?.vendors ?? []).map(toChoice),
  };
  const isFiltered = hasOrderFilters(filters);
  // What every purchase order the filters leave costs in all, with GST, not
  // only those loaded.
  const purchaseTotal = firstPage?.purchase_total ?? 0;
  const clearFilters = () =>
    setFilters({ ...NO_ORDER_FILTERS, type: filters.type });

  // What the section lets you do beside its tab: add an order. Its filters
  // sit over the table.
  const actions = (
    <CustomButton
      variant='outline'
      Icon={Plus}
      text='New order'
      onClick={() => openDialog(null)}
      disableForViewer
    />
  );

  const table = pageQueries[0]?.isLoading ? (
    <ContractOrdersSkeleton />
  ) : totalOrders === 0 ? (
    <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-500'>
      No orders yet. Add a purchase order to buy material, or a sub-contract to
      give out work.
    </p>
  ) : (
    <div>
      <ContractOrderFilterBar
        filters={filters}
        onChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        counts={typeCounts}
        sites={choices.sites}
        vendors={choices.vendors}
        isFiltered={isFiltered}
      />
      {/* A row per order, spread across the width; scrolls sideways when
          narrow. A footer counts them and what the purchase orders cost. */}
      <div className='overflow-hidden rounded-lg border border-gray-200'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50 hover:bg-gray-50'>
                <TableHead className={cn(headClass, "w-[12rem] pl-4 sm:pl-4")}>
                  Order
                </TableHead>
                <TableHead className={cn(headClass, "w-[10rem]")}>
                  Vendors
                </TableHead>
                <TableHead className={headClass}>
                  Requirements by site
                </TableHead>
                <TableHead className={cn(headClass, "w-[8.5rem] text-right")}>
                  Cost
                </TableHead>
                <TableHead className={cn(headClass, "w-[8rem]")}>
                  Completion
                </TableHead>
                <TableHead className={cn(headClass, "w-px")}>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shownOrders.length === 0 && (
                <TableRow className='hover:bg-transparent'>
                  <TableCell
                    colSpan={6}
                    className='py-6 text-center text-xs text-gray-500 sm:py-6'>
                    {isFiltered ? (
                      <>
                        No orders match these filters.{" "}
                        <button
                          type='button'
                          onClick={clearFilters}
                          className='cursor-pointer font-medium text-emerald-700 hover:text-emerald-800'>
                          Clear filters
                        </button>
                      </>
                    ) : (
                      `No ${ORDER_TYPES.find((group) => group.type === filters.type)?.filterLabel.toLowerCase()} yet.`
                    )}
                  </TableCell>
                </TableRow>
              )}
              {shownOrders.map((order) => {
                const group = orderTypeOf(order.type);
                const documents = toDocuments(order.documents);
                const cost = purchaseOrderCost(order);
                return (
                  <TableRow
                    key={order.id}
                    onClick={() => setDetailsId(order.id)}
                    className='cursor-pointer hover:bg-gray-50/60'>
                    <TableCell className={cn(cellClass, "pl-4 sm:pl-4")}>
                      <div className='flex items-start gap-3'>
                        <div
                          title={group.label}
                          className={cn(
                            "mt-0.5 shrink-0 rounded-md p-1.5 ring-1 ring-inset",
                            group.tone,
                          )}>
                          <group.Icon className='size-3.5' />
                        </div>
                        <div className='min-w-0'>
                          <button
                            type='button'
                            onClick={() => setDetailsId(order.id)}
                            title={`Open ${order.code}`}
                            className='block max-w-full cursor-pointer truncate rounded font-mono text-sm font-semibold text-gray-900 hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
                            {order.code}
                          </button>
                          <p className='whitespace-nowrap text-xs text-gray-600'>
                            {format(new Date(order.order_date), "d MMM yyyy")}
                          </p>
                          {order.order_number && (
                            <p
                              className='truncate text-xs text-gray-400'
                              title={order.order_number}>
                              Ref. {order.order_number}
                            </p>
                          )}
                          {order.single_expense && (
                            <p className='text-[11px] text-gray-400'>
                              One expense each
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-xs leading-5")}>
                      {order.vendors.map((vendor) => (
                        <p
                          key={vendor.id}
                          className='max-w-[8.5rem] truncate text-gray-700'
                          title={vendor.name}>
                          {vendor.name}
                        </p>
                      ))}
                    </TableCell>
                    <TableCell className={cellClass}>
                      {/* A line per site: its name, then what's required,
                          wrapping under the requirements, not the name. */}
                      <div className='grid grid-cols-[max-content_1fr] items-start gap-x-2 gap-y-1.5'>
                        {requirementsBySite(order.items).map(
                          ([siteId, site]) => (
                            <React.Fragment key={siteId}>
                              <span className='inline-flex h-5 items-center gap-1 whitespace-nowrap text-xs font-medium text-gray-700'>
                                <MapPin className='size-3 text-gray-400' />
                                {site.name}
                              </span>
                              <div className='flex flex-wrap gap-1.5'>
                                {site.items.map((item) => (
                                  <span
                                    key={item.id}
                                    className='inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-gray-50 px-1.5 py-0.5 text-xs ring-1 ring-inset ring-gray-200'>
                                    <span className='font-medium text-gray-700'>
                                      {itemLabel(item.item, item.description)}
                                    </span>
                                    <span className='tabular-nums text-gray-500'>
                                      {requirementTerms(order, item)}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </React.Fragment>
                          ),
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={cn(cellClass, "text-right")}>
                      {cost ? (
                        <>
                          <p className='text-sm font-medium tabular-nums text-gray-900'>
                            {formatAmount(cost.total)}
                          </p>
                          <p className='text-[11px] tabular-nums text-gray-400'>
                            {formatAmount(cost.rate)}/{OIL_ZAPPER.UNIT} +{" "}
                            {cost.gst}% GST
                          </p>
                        </>
                      ) : (
                        <span
                          className='text-xs leading-5 text-gray-400'
                          title='Costed at each site, through its expenses'>
                          At site rates
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cellClass}
                      // Its badge and dialog leave the row's click alone.
                      onClick={(event) => event.stopPropagation()}>
                      <OrderCompletionDocuments
                        workOrderId={workOrderId}
                        order={order}
                      />
                    </TableCell>
                    <TableCell
                      className={cn(cellClass, "py-2.5 sm:py-2.5")}
                      onClick={(event) => event.stopPropagation()}>
                      <div className='flex items-center justify-end gap-0.5'>
                        {documents.length > 0 && (
                          <DocumentsMenu documents={documents}>
                            <button
                              type='button'
                              title='Order documents'
                              className='rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700'>
                              <FileText className='size-3.5' />
                            </button>
                          </DocumentsMenu>
                        )}
                        {!isViewer && (
                          <>
                            <button
                              type='button'
                              title='Edit order'
                              onClick={() => openDialog(order)}
                              className='rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700'>
                              <Pencil className='size-3.5' />
                            </button>
                            <button
                              type='button'
                              title='Delete order'
                              disabled={deleteOrder.isPending}
                              onClick={() => {
                                if (confirm(`Delete order ${order.code}?`)) {
                                  deleteOrder.mutate({ id: order.id });
                                }
                              }}
                              className='rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500'>
                              <Trash2 className='size-3.5' />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className='flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-gray-200 bg-gray-50/60 px-4 py-2 text-xs text-gray-500'>
          <span>
            {shownOrders.length < shownTotal
              ? `Showing ${shownOrders.length} of ${shownTotal} orders`
              : `${shownTotal} order${shownTotal !== 1 ? "s" : ""}`}
            {shownTotal !== totalOrders && ` (of ${totalOrders})`}
          </span>
          {purchaseTotal > 0 && (
            <span>
              Purchase orders{" "}
              <span className='font-semibold tabular-nums text-gray-900'>
                {formatAmount(purchaseTotal)}
              </span>{" "}
              with GST
            </span>
          )}
        </div>
      </div>
      {lastPage?.pagination.hasMore && (
        <LoadMoreBtn
          onClick={loadMore}
          loading={isFetchingMore}
          className='pt-4'
        />
      )}
    </div>
  );

  return (
    <>
      {children({ actions, table, count: totalOrders })}

      <ContractOrderDialog
        workOrderId={workOrderId}
        open={dialogOpen}
        onClose={closeDialog}
        editing={editing}
        onCreated={setDetailsId}
      />
      <ContractOrderDetailsDialog
        workOrderId={workOrderId}
        orderId={detailsId}
        onClose={() => setDetailsId(null)}
        onEdit={(order) => {
          setReturnToId(order.id);
          setDetailsId(null);
          openDialog(order);
        }}
      />
    </>
  );
};

export default ContractOrdersSection;

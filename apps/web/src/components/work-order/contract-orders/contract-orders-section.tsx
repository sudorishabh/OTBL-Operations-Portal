"use client";
import React, { useMemo, useState } from "react";
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
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useApiError } from "@/hooks/useApiError";
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
import ContractOrderFilterBar from "./contract-order-filter-bar";
import {
  NO_ORDER_FILTERS,
  countByType,
  filterChoices,
  filterOrders,
  hasOrderFilters,
  type OrderFilters,
  type OrderSort,
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
  const [filters, setFilters] = useState<OrderFilters>(NO_ORDER_FILTERS);
  const [sort, setSort] = useState<OrderSort>("newest");

  const ordersQuery = trpc.contractOrderQuery.getContractOrders.useQuery({
    work_order_id: workOrderId,
  });
  const orders = (ordersQuery.data ?? []) as ContractOrder[];

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

  const shownOrders = useMemo(
    () => filterOrders(orders, filters, sort),
    [orders, filters, sort],
  );
  const typeCounts = useMemo(
    () => countByType(orders, filters),
    [orders, filters],
  );
  const choices = useMemo(() => filterChoices(orders), [orders]);
  const isFiltered = hasOrderFilters(filters);
  // What the purchase orders shown cost in all, with GST.
  const purchaseTotal = shownOrders.reduce(
    (sum, order) => sum + (purchaseOrderCost(order)?.total ?? 0),
    0,
  );
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

  const table = ordersQuery.isLoading ? (
    <ContractOrdersSkeleton />
  ) : orders.length === 0 ? (
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
                    className='hover:bg-gray-50/60'>
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
                          <p className='truncate font-mono text-sm font-semibold text-gray-900'>
                            {order.code}
                          </p>
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
                    <TableCell className={cellClass}>
                      <OrderCompletionDocuments
                        workOrderId={workOrderId}
                        order={order}
                      />
                    </TableCell>
                    <TableCell className={cn(cellClass, "py-2.5 sm:py-2.5")}>
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
            {shownOrders.length === orders.length
              ? `${orders.length} order${orders.length !== 1 ? "s" : ""}`
              : `Showing ${shownOrders.length} of ${orders.length} orders`}
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
    </div>
  );

  return (
    <>
      {children({ actions, table, count: orders.length })}

      <ContractOrderDialog
        workOrderId={workOrderId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
    </>
  );
};

export default ContractOrdersSection;

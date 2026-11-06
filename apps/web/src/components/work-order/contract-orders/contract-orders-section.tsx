"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import OrderCompletionDocuments from "./order-completion-documents";
import ContractOrdersSkeleton from "@/components/skeleton/work-order/contract-orders-skeleton";

const { CONTRACT_ORDER_TYPE, CONTRACT_ORDER_ITEMS, OIL_ZAPPER } = constants;

export interface ContractOrder {
  id: number;
  type: "purchase_order" | "sub_contract";
  order_number: string;
  order_date: string | Date;
  description: string | null;
  // A purchase order's cost; none on a sub-contract.
  unit_rate: string | null;
  gst_percentage: string | null;
  invoice_number: string | null;
  documents: unknown;
  completion_documents: unknown;
  items: {
    id: number;
    work_order_site_id: number;
    site_name: string | null;
    item: string;
    description: string | null;
    quantity: string;
    unit: string;
  }[];
  vendors: { id: number; name: string }[];
}

interface Props {
  workOrderId: number;
  // Lays out the section's actions and its table, such as in a tab.
  children: (parts: {
    actions: React.ReactNode;
    table: React.ReactNode;
    count: number;
  }) => React.ReactNode;
}

export const itemLabel = (item: string, description?: string | null) =>
  item === "other" && description
    ? description
    : (CONTRACT_ORDER_ITEMS.find((option) => option.key === item)?.label ??
      item);

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

// What a purchase order costs in all: its oil zapper at its rate, with GST.
// Null for a sub-contract, costed at its site.
const purchaseOrderCost = (order: ContractOrder) => {
  if (order.type !== CONTRACT_ORDER_TYPE.PURCHASE_ORDER || !order.unit_rate) {
    return null;
  }
  const quantity = order.items.reduce(
    (sum, item) => sum + Number(item.quantity),
    0,
  );
  const rate = Number(order.unit_rate);
  const gst = Number(order.gst_percentage ?? 0);
  return { total: quantity * rate * (1 + gst / 100), rate, gst };
};

// How each kind of order is marked in the list.
const GROUPS = [
  {
    type: CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
    label: "Purchase order",
    filterLabel: "Purchase orders",
    Icon: ShoppingCart,
    tone: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  {
    type: CONTRACT_ORDER_TYPE.SUB_CONTRACT,
    label: "Sub-contract",
    filterLabel: "Sub-contracts",
    Icon: Wrench,
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
] as const;

// Tighter than the table defaults, at every screen size.
// Which orders the list shows: all of them, or one type.
type OrderFilter = "all" | ContractOrder["type"];

const FILTERS: {
  value: OrderFilter;
  label: string;
  Icon: React.ElementType | null;
}[] = [
  { value: "all", label: "All", Icon: null },
  ...GROUPS.map((group) => ({
    value: group.type,
    label: group.filterLabel,
    Icon: group.Icon,
  })),
];

const headClass = "h-9 px-4 sm:h-9 sm:px-4 text-xs font-medium text-gray-500";
const cellClass = "px-4 py-3 sm:px-4 sm:py-3";

// The purchase orders and sub-contracts bioremediation work is given out
// through. One order can require things at several of the work order's sites.
const ContractOrdersSection = ({ workOrderId, children }: Props) => {
  const isViewer = useIsViewer();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractOrder | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");

  const ordersQuery = trpc.contractOrderQuery.getContractOrders.useQuery({
    work_order_id: workOrderId,
  });
  const orders = (ordersQuery.data ?? []) as ContractOrder[];

  const deleteOrder = trpc.contractOrderMutation.deleteContractOrder.useMutation(
    {
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
    },
  );

  const openDialog = (order: ContractOrder | null) => {
    setEditing(order);
    setDialogOpen(true);
  };

  const purchaseCount = orders.filter(
    (order) => order.type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
  ).length;
  const subContractCount = orders.length - purchaseCount;
  const shownOrders =
    filter === "all" ? orders : orders.filter((order) => order.type === filter);
  const filterCounts: Record<OrderFilter, number> = {
    all: orders.length,
    [CONTRACT_ORDER_TYPE.PURCHASE_ORDER]: purchaseCount,
    [CONTRACT_ORDER_TYPE.SUB_CONTRACT]: subContractCount,
  };

  // What the section lets you do: filter by type and add an order.
  const actions = (
    <>
      {orders.length > 0 && (
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as OrderFilter)}>
          <TabsList className='h-8'>
            {FILTERS.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className='gap-1.5 px-2.5 text-xs text-gray-800'>
                {Icon && <Icon className='size-3.5 text-gray-500' />}
                {label}
                <span className='tabular-nums text-gray-400'>
                  {filterCounts[value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <CustomButton
        variant='outline'
        Icon={Plus}
        text='New order'
        onClick={() => openDialog(null)}
        disableForViewer
      />
    </>
  );

  const table =
    ordersQuery.isLoading ? (
      <ContractOrdersSkeleton />
    ) : orders.length === 0 ? (
      <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-500'>
        No orders yet. Add a purchase order to buy material, or a sub-contract
        to give out work.
      </p>
    ) : (
      // A row per order, spread across the width; scrolls sideways when
      // narrow.
      <div className='overflow-x-auto rounded-lg border border-gray-200'>
        <Table>
          <TableHeader>
            <TableRow className='bg-gray-50 hover:bg-gray-50'>
              <TableHead className={cn(headClass, "w-[16rem]")}>Order</TableHead>
              <TableHead className={cn(headClass, "w-[7.5rem]")}>Date</TableHead>
              <TableHead className={cn(headClass, "w-[12rem]")}>Vendors</TableHead>
              <TableHead className={headClass}>Requirements by site</TableHead>
              <TableHead className={cn(headClass, "w-px")}>
                <span className='sr-only'>Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shownOrders.length === 0 && (
              <TableRow className='hover:bg-transparent'>
                <TableCell
                  colSpan={5}
                  className='py-6 text-center text-xs text-gray-500 sm:py-6'>
                  No{" "}
                  {GROUPS.find((group) => group.type === filter)?.filterLabel.toLowerCase()}{" "}
                  yet.
                </TableCell>
              </TableRow>
            )}
            {shownOrders.map((order) => {
              const group =
                GROUPS.find((option) => option.type === order.type) ??
                GROUPS[0];
              const documents = toDocuments(order.documents);
              const cost = purchaseOrderCost(order);
              return (
                <TableRow
                  key={order.id}
                  className='hover:bg-gray-50/60'>
                  <TableCell className={cellClass}>
                    <div className='flex items-center gap-3'>
                      <div
                        title={group.label}
                        className={cn(
                          "shrink-0 rounded-md p-1.5 ring-1 ring-inset",
                          group.tone,
                        )}>
                        <group.Icon className='size-3.5' />
                      </div>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-gray-900'>
                          {order.order_number}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {group.label}
                          {cost && (
                            <>
                              {" · "}
                              <span className='font-medium tabular-nums text-gray-800'>
                                {formatAmount(cost.total)}
                              </span>
                            </>
                          )}
                        </p>
                        {cost && (
                          <p className='text-[11px] tabular-nums text-gray-400'>
                            {formatAmount(cost.rate)}/{OIL_ZAPPER.UNIT} +{" "}
                            {cost.gst}% GST
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(cellClass, "whitespace-nowrap text-xs text-gray-600")}>
                    {format(new Date(order.order_date), "d MMM yyyy")}
                  </TableCell>
                  <TableCell className={cn(cellClass, "text-xs text-gray-700")}>
                    {order.vendors.map((vendor) => vendor.name).join(", ")}
                  </TableCell>
                  <TableCell className={cellClass}>
                    <div className='flex flex-wrap gap-1.5'>
                      {order.items.map((item) => (
                        <span
                          key={item.id}
                          className='inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-700 ring-1 ring-inset ring-gray-200'>
                          <span className='text-gray-500'>
                            {item.site_name ?? "Site"}
                          </span>
                          <span className='font-medium'>
                            {itemLabel(item.item, item.description)}
                          </span>
                          <span className='tabular-nums'>
                            {Number(item.quantity).toLocaleString("en-IN")}{" "}
                            {item.unit}
                          </span>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className={cn(cellClass, "text-right")}>
                    <div className='flex items-center justify-end gap-0.5'>
                      <OrderCompletionDocuments
                        workOrderId={workOrderId}
                        order={order}
                      />
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
                              if (confirm(`Delete order ${order.order_number}?`)) {
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

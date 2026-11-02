"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  HardHat,
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
import DocumentsMenu from "@/components/shared/documents-menu";
import ContractOrderDialog from "./contract-order-dialog";

const { CONTRACT_ORDER_TYPE, CONTRACT_ORDER_ITEMS } = constants;

export interface ContractOrder {
  id: number;
  type: "purchase_order" | "work_order";
  order_number: string;
  order_date: string | Date;
  description: string | null;
  documents: unknown;
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
}

export const itemLabel = (item: string, description?: string | null) =>
  item === "other" && description
    ? description
    : (CONTRACT_ORDER_ITEMS.find((option) => option.key === item)?.label ??
      item);

// How each kind of order is marked in the list.
const GROUPS = [
  {
    type: CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
    label: "Purchase order",
    Icon: ShoppingCart,
    tone: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  {
    type: CONTRACT_ORDER_TYPE.WORK_ORDER,
    label: "Work order (subcontract)",
    Icon: Wrench,
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
  },
] as const;

// The purchase and subcontract orders bioremediation work is given out
// through. One order can require things at several of the work order's sites.
const ContractOrdersSection = ({ workOrderId }: Props) => {
  const isViewer = useIsViewer();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractOrder | null>(null);

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
  const workCount = orders.length - purchaseCount;

  return (
    <div className='mt-6 border-t border-gray-100 pt-6'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold text-gray-900'>
            Purchase and work orders
          </h3>
          <p className='text-xs text-gray-500'>
            {orders.length === 0
              ? "Material bought and work subcontracted for these sites"
              : `${purchaseCount} purchase ${purchaseCount === 1 ? "order" : "orders"}, ${workCount} work ${workCount === 1 ? "order" : "orders"}`}
          </p>
        </div>
        <CustomButton
          variant='outline'
          Icon={Plus}
          text='New order'
          onClick={() => openDialog(null)}
          disableForViewer
        />
      </div>

      {orders.length === 0 ? (
        <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-500'>
          {ordersQuery.isLoading
            ? "Loading orders..."
            : "No orders yet. Add a purchase order to buy material, or a work order to subcontract work."}
        </p>
      ) : (
        <ul className='divide-y divide-gray-100 rounded-lg border border-gray-200'>
          {orders.map((order) => {
            const group =
              GROUPS.find((option) => option.type === order.type) ?? GROUPS[0];
            const documents = toDocuments(order.documents);
            return (
              <li
                key={order.id}
                className='flex items-start gap-3 px-4 py-3'>
                <div
                  title={group.label}
                  className={cn(
                    "mt-0.5 shrink-0 rounded-md p-1.5 ring-1 ring-inset",
                    group.tone,
                  )}>
                  <group.Icon className='size-3.5' />
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-baseline gap-x-3 gap-y-0.5'>
                    <span className='text-sm font-semibold text-gray-900'>
                      {order.order_number}
                    </span>
                    <span className='text-xs text-gray-500'>{group.label}</span>
                    <span className='text-xs text-gray-500'>
                      {format(new Date(order.order_date), "d MMM yyyy")}
                    </span>
                  </div>
                  <p className='mt-0.5 flex items-center gap-1.5 text-xs text-gray-600'>
                    <HardHat className='size-3.5 shrink-0 text-gray-400' />
                    {order.vendors.map((vendor) => vendor.name).join(", ")}
                  </p>
                  {/* What the order requires at each of its sites. */}
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {order.items.map((item) => (
                      <span
                        key={item.id}
                        className='inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-700 ring-1 ring-inset ring-gray-200'>
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
                </div>

                <div className='flex shrink-0 items-center gap-0.5'>
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
              </li>
            );
          })}
        </ul>
      )}

      <ContractOrderDialog
        workOrderId={workOrderId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />
    </div>
  );
};

export default ContractOrdersSection;

"use client";
import React, { useState } from "react";
import { format } from "date-fns";
import { FileText, Pencil, Plus, ShoppingCart, Trash2, Wrench } from "lucide-react";
import toast from "react-hot-toast";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
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

const GROUPS = [
  {
    type: CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
    title: "Purchase Orders",
    Icon: ShoppingCart,
  },
  {
    type: CONTRACT_ORDER_TYPE.WORK_ORDER,
    title: "Work Orders (Subcontract)",
    Icon: Wrench,
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

  return (
    <div className='mt-6 border-t pt-5'>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h3 className='text-sm font-semibold text-gray-800'>
            Purchase &amp; Work Orders
          </h3>
          <p className='text-xs text-gray-500'>
            Orders placed with vendors and what each requires at every site.
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
        <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-400'>
          {ordersQuery.isLoading ? "Loading orders..." : "No orders placed yet."}
        </p>
      ) : (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {GROUPS.map(({ type, title, Icon }) => {
            const groupOrders = orders.filter((order) => order.type === type);
            return (
              <div
                key={type}
                className='space-y-2'>
                <p className='flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                  <Icon className='size-3.5' />
                  {title}
                  <span className='font-normal text-gray-400'>
                    ({groupOrders.length})
                  </span>
                </p>
                {groupOrders.length === 0 && (
                  <p className='text-xs text-gray-400'>None yet.</p>
                )}
                {groupOrders.map((order) => {
                  const documents = toDocuments(order.documents);
                  return (
                    <div
                      key={order.id}
                      className='rounded-lg border bg-white p-3 text-xs'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='font-mono font-semibold text-gray-800'>
                            {order.order_number}
                          </p>
                          <p className='text-gray-500'>
                            {format(new Date(order.order_date), "dd MMM yyyy")}{" "}
                            · {order.vendors.map((v) => v.name).join(", ")}
                          </p>
                        </div>
                        <div className='flex shrink-0 items-center gap-1'>
                          {documents.length > 0 && (
                            <DocumentsMenu documents={documents}>
                              <button
                                type='button'
                                title='Order documents'
                                className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700'>
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
                                className='rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700'>
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
                                className='rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500'>
                                <Trash2 className='size-3.5' />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <ul className='mt-2 space-y-0.5 border-t pt-2 text-gray-600'>
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className='flex justify-between gap-2'>
                            <span className='truncate'>
                              {item.site_name ?? "Site"} ·{" "}
                              {itemLabel(item.item, item.description)}
                            </span>
                            <span className='shrink-0 tabular-nums'>
                              {Number(item.quantity).toLocaleString("en-IN")}{" "}
                              {item.unit}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
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

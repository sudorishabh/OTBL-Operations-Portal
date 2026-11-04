"use client";
import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { constants } from "@pkg/utils";
import { contractOrderSchemas } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { useApiError } from "@/hooks/useApiError";
import { useSharePointUpload } from "@/hooks/useSharePointUpload";
import {
  toDocuments,
  toStoredDocument,
  type StoredDocument,
} from "@/lib/documents";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import DocumentsField from "@/components/shared/documents-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContractOrder } from "./contract-orders-section";

const { CONTRACT_ORDER_TYPE, CONTRACT_ORDER_ITEMS, contractOrderTypeOptions } =
  constants;

type OrderType = (typeof contractOrderTypeOptions)[number]["value"];

interface ItemRow {
  // Stable React key for rows not saved yet.
  key: string;
  id?: number;
  siteId: string;
  item: string;
  description: string;
  quantity: string;
}

interface Props {
  workOrderId: number;
  open: boolean;
  onClose: () => void;
  // The order being edited; a new one when left out.
  editing?: ContractOrder | null;
}

const newRow = (): ItemRow => ({
  key: crypto.randomUUID(),
  siteId: "",
  item: "",
  description: "",
  quantity: "",
});

const fieldLabel = "mb-1 block text-xs font-medium text-gray-700";

const itemUnit = (item: string) =>
  CONTRACT_ORDER_ITEMS.find((option) => option.key === item)?.unit ?? "";

// Creates or edits a purchase order or sub-contract: who it is given to and
// what it requires at each of the work order's sites.
const ContractOrderDialog = ({
  workOrderId,
  open,
  onClose,
  editing,
}: Props) => {
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const [type, setType] = useState<OrderType>(CONTRACT_ORDER_TYPE.PURCHASE_ORDER);
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [description, setDescription] = useState("");
  const [vendorIds, setVendorIds] = useState<number[]>([]);
  const [rows, setRows] = useState<ItemRow[]>([newRow()]);
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);

  const sitesQuery = trpc.contractOrderQuery.getOrderableSites.useQuery(
    { work_order_id: workOrderId },
    { enabled: open },
  );
  const vendorsQuery = trpc.contractorQuery.getContractors.useQuery(
    {},
    { enabled: open },
  );
  // Inactive vendors can't take new orders, but an edit keeps its own.
  const vendors = (vendorsQuery.data?.contractors ?? []).filter(
    (vendor: any) => vendor.status === "active" || vendorIds.includes(vendor.id),
  );

  const {
    uploadFiles,
    isUploading,
    progress,
    reset: resetUpload,
  } = useSharePointUpload({
    folderPath: `/WorkOrders/${workOrderId}/ContractOrders`,
    conflictBehavior: "rename",
  });

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? CONTRACT_ORDER_TYPE.PURCHASE_ORDER);
    setOrderNumber(editing?.order_number ?? "");
    setOrderDate(
      format(editing ? new Date(editing.order_date) : new Date(), "yyyy-MM-dd"),
    );
    setDescription(editing?.description ?? "");
    setVendorIds(editing?.vendors.map((vendor) => vendor.id) ?? []);
    setRows(
      editing?.items.length
        ? editing.items.map((item) => ({
            key: String(item.id),
            id: item.id,
            siteId: String(item.work_order_site_id),
            item: item.item,
            description: item.description ?? "",
            quantity: String(Number(item.quantity)),
          }))
        : [newRow()],
    );
    setFiles([]);
    setSavedDocuments(toDocuments(editing?.documents));
    resetUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const onSaved = async (message: string) => {
    toast.success(message);
    onClose();
    await Promise.all([
      utils.contractOrderQuery.getContractOrders.invalidate({
        work_order_id: workOrderId,
      }),
      utils.contractOrderQuery.getSiteContractOrderItems.invalidate(),
    ]);
  };
  const onError = (error: unknown) => handleError(error, { showToast: true });

  const createOrder = trpc.contractOrderMutation.createContractOrder.useMutation({
    onSuccess: () => onSaved("Order added"),
    onError,
  });
  const updateOrder = trpc.contractOrderMutation.updateContractOrder.useMutation({
    onSuccess: () => onSaved("Order updated"),
    onError,
  });

  const updateRow = (key: string, change: Partial<ItemRow>) =>
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );

  const toggleVendor = (id: number, checked: boolean) =>
    setVendorIds((prev) =>
      checked ? [...prev, id] : prev.filter((vendorId) => vendorId !== id),
    );

  const save = async () => {
    const order = {
      type,
      order_number: orderNumber,
      order_date: orderDate ? new Date(orderDate) : undefined,
      description,
      documents: savedDocuments,
      contractor_ids: vendorIds,
      items: rows.map((row) => ({
        id: row.id,
        work_order_site_id: Number(row.siteId),
        item: row.item,
        description: row.description || undefined,
        quantity: Number(row.quantity),
      })),
    };
    const parsed = contractOrderSchemas.baseContractOrderSchema.safeParse(order);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the order's details");
      return;
    }

    const uploaded = files.length > 0 ? await uploadFiles(files) : [];
    if (!uploaded) return;
    const values = {
      ...parsed.data,
      documents: [...savedDocuments, ...uploaded.map(toStoredDocument)],
    };

    if (editing) {
      updateOrder.mutate({ ...values, id: editing.id });
    } else {
      createOrder.mutate({ ...values, work_order_id: workOrderId });
    }
  };

  const isSaving = isUploading || createOrder.isPending || updateOrder.isPending;
  const sites = (sitesQuery.data ?? []) as { id: number; name: string }[];

  return (
    <DialogWindow
      title={editing ? "Edit Order" : "New Order"}
      description='A purchase order buys material; a sub-contract gives out a service'
      size='xl'
      heightMode='full'
      open={open}
      setOpen={(next) => {
        if (!next && !isSaving) onClose();
      }}>
      <div className='space-y-5 py-2'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div>
            <label className={fieldLabel}>Order type</label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as OrderType)}>
              <SelectTrigger className='h-9 w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contractOrderTypeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={fieldLabel}>Order number</label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder='e.g. PO-2026-014'
              className='h-9'
            />
          </div>
          <div>
            <label className={fieldLabel}>Order date</label>
            <Input
              type='date'
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className='h-9'
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Vendors</label>
          <div className='max-h-40 overflow-y-auto rounded-lg border bg-white p-2'>
            {vendors.length === 0 ? (
              <p className='px-1 py-2 text-xs text-gray-400'>
                {vendorsQuery.isLoading
                  ? "Loading vendors..."
                  : "No vendors yet. Add them on the Vendors page."}
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
                {vendors.map((vendor: any) => (
                  <label
                    key={vendor.id}
                    className='flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50'>
                    <Checkbox
                      checked={vendorIds.includes(vendor.id)}
                      onCheckedChange={(checked) =>
                        toggleVendor(vendor.id, checked === true)
                      }
                    />
                    {vendor.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className='mb-1 flex items-center justify-between'>
            <label className='text-xs font-medium text-gray-700'>
              Requirements by site
            </label>
            <button
              type='button'
              onClick={() => setRows((prev) => [...prev, newRow()])}
              className='inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100'>
              <Plus className='size-3.5' />
              Add requirement
            </button>
          </div>
          <div className='space-y-2'>
            {rows.map((row) => (
              <div
                key={row.key}
                className='grid grid-cols-1 items-start gap-2 rounded-lg border bg-gray-50/50 p-2 sm:grid-cols-[1fr_1fr_1fr_120px_32px]'>
                <Select
                  value={row.siteId}
                  onValueChange={(siteId) => updateRow(row.key, { siteId })}>
                  <SelectTrigger className='h-9 w-full bg-white'>
                    <SelectValue
                      placeholder={
                        sites.length === 0 ? "No sites yet" : "Site"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem
                        key={site.id}
                        value={String(site.id)}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={row.item}
                  onValueChange={(item) => updateRow(row.key, { item })}>
                  <SelectTrigger className='h-9 w-full bg-white'>
                    <SelectValue placeholder='Item' />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_ORDER_ITEMS.map((option) => (
                      <SelectItem
                        key={option.key}
                        value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={row.description}
                  onChange={(e) =>
                    updateRow(row.key, { description: e.target.value })
                  }
                  placeholder={
                    row.item === "other" ? "Describe the item" : "Note (optional)"
                  }
                  disabled={row.item !== "other"}
                  className='h-9 bg-white'
                />
                <div className='relative'>
                  <Input
                    inputMode='decimal'
                    value={row.quantity}
                    onChange={(e) => {
                      if (/^[0-9]*[.]?[0-9]*$/.test(e.target.value)) {
                        updateRow(row.key, { quantity: e.target.value });
                      }
                    }}
                    placeholder='Qty'
                    className='h-9 bg-white pr-14'
                  />
                  <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400'>
                    {itemUnit(row.item)}
                  </span>
                </div>
                <button
                  type='button'
                  title='Remove requirement'
                  disabled={rows.length === 1}
                  onClick={() =>
                    setRows((prev) => prev.filter((r) => r.key !== row.key))
                  }
                  className='flex h-9 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30'>
                  <Trash2 className='size-4' />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Optional'
            rows={2}
          />
        </div>

        <DocumentsField
          label='Order documents (optional)'
          files={files}
          onFilesChange={setFiles}
          existing={savedDocuments}
          onRemoveExisting={(index) =>
            setSavedDocuments((prev) => prev.filter((_, i) => i !== index))
          }
          isUploading={isUploading}
          progress={progress}
        />

        <div className='flex justify-end gap-2'>
          <CustomButton
            type='button'
            variant='outline'
            text='Cancel'
            disabled={isSaving}
            onClick={onClose}
          />
          <CustomButton
            type='button'
            variant='primary'
            text={editing ? "Save order" : "Add order"}
            loading={isSaving}
            disabled={isSaving}
            onClick={save}
          />
        </div>
      </div>
    </DialogWindow>
  );
};

export default ContractOrderDialog;

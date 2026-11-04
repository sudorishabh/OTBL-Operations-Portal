"use client";
import React, { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { constants } from "@pkg/utils";
import { contractOrderSchemas } from "@pkg/schema";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
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
import { itemLabel, type ContractOrder } from "./contract-orders-section";

const {
  CONTRACT_ORDER_TYPE,
  CONTRACT_ORDER_ITEMS,
  GST_PERCENTAGE,
  OIL_ZAPPER,
  contractOrderTypeOptions,
} = constants;

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

// What a sub-contract can give out; a purchase order only buys oil zapper.
const SUB_CONTRACT_ITEMS = CONTRACT_ORDER_ITEMS.filter(
  (option) => option.orderType === CONTRACT_ORDER_TYPE.SUB_CONTRACT,
);

const newRow = (type: OrderType, siteId = ""): ItemRow => ({
  key: crypto.randomUUID(),
  siteId,
  item: type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER ? OIL_ZAPPER.KEY : "",
  description: "",
  quantity: "",
});

const fieldLabel = "mb-1 block text-xs font-medium text-gray-700";
const sectionClass = "space-y-3 border-t border-gray-100 pt-4";

// To the paisa, as the cost is recorded.
const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

const itemUnit = (item: string) =>
  CONTRACT_ORDER_ITEMS.find((option) => option.key === item)?.unit ?? "";

// Lets only a decimal number be typed.
const decimalInput =
  (onChange: (value: string) => void) =>
  (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^[0-9]*[.]?[0-9]*$/.test(e.target.value)) onChange(e.target.value);
  };

const SectionTitle = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className='flex items-end justify-between gap-3'>
    <div>
      <h3 className='text-sm font-medium text-gray-900'>{title}</h3>
      {description && (
        <p className='mt-0.5 text-xs text-gray-500'>{description}</p>
      )}
    </div>
    {action}
  </div>
);

const AddRowButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type='button'
    onClick={onClick}
    className='inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100'>
    <Plus className='size-3.5' />
    {label}
  </button>
);

const RemoveRowButton = ({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) => (
  <button
    type='button'
    title='Remove row'
    disabled={disabled}
    onClick={onClick}
    className='flex h-9 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30'>
    <Trash2 className='size-4' />
  </button>
);

// Creates or edits a purchase order or sub-contract. A purchase order buys oil
// zapper from one vendor for one or more sites, at a rate that sets its cost
// at each site. A sub-contract gives out work at one site to its vendors,
// whose expenses are recorded at the site.
const ContractOrderDialog = ({
  workOrderId,
  open,
  onClose,
  editing,
}: Props) => {
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const [type, setType] = useState<OrderType>(
    CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
  );
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [description, setDescription] = useState("");
  const [vendorIds, setVendorIds] = useState<number[]>([]);
  const [rows, setRows] = useState<ItemRow[]>([newRow(type)]);
  const [unitRate, setUnitRate] = useState("");
  const [gstPercentage, setGstPercentage] = useState(String(GST_PERCENTAGE));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [savedCompletion, setSavedCompletion] = useState<StoredDocument[]>([]);

  const isPurchase = type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER;
  const typeLabel = isPurchase ? "Purchase order" : "Sub-contract";

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
    (vendor: any) =>
      vendor.status === "active" || vendorIds.includes(vendor.id),
  ) as { id: number; name: string }[];
  const sites = (sitesQuery.data ?? []) as { id: number; name: string }[];

  const documentsUpload = useSharePointUpload({
    folderPath: `/WorkOrders/${workOrderId}/ContractOrders`,
    conflictBehavior: "rename",
  });
  const completionUpload = useSharePointUpload({
    folderPath: `/WorkOrders/${workOrderId}/ContractOrders/Completion`,
    conflictBehavior: "rename",
  });

  useEffect(() => {
    if (!open) return;
    const startType = editing?.type ?? CONTRACT_ORDER_TYPE.PURCHASE_ORDER;
    setType(startType);
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
        : [newRow(startType)],
    );
    setUnitRate(editing?.unit_rate ? String(Number(editing.unit_rate)) : "");
    setGstPercentage(
      editing?.gst_percentage != null
        ? String(Number(editing.gst_percentage))
        : String(GST_PERCENTAGE),
    );
    setInvoiceNumber(editing?.invoice_number ?? "");
    setFiles([]);
    setSavedDocuments(toDocuments(editing?.documents));
    setCompletionFiles([]);
    setSavedCompletion(toDocuments(editing?.completion_documents));
    documentsUpload.reset();
    completionUpload.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // The site a sub-contract is for: its rows' one site, or none while they
  // differ, as an order added before the rule may.
  const subContractSiteId = rows.every((row) => row.siteId === rows[0]?.siteId)
    ? (rows[0]?.siteId ?? "")
    : "";
  const hasMixedSites = new Set(rows.map((row) => row.siteId)).size > 1;

  // Switching type keeps the sites and vendors that still fit, and starts
  // the rows over, as the two take different items.
  const changeType = (next: OrderType) => {
    if (next === type) return;
    setType(next);
    setRows(
      next === CONTRACT_ORDER_TYPE.PURCHASE_ORDER
        ? [newRow(next, rows[0]?.siteId)]
        : [newRow(next, subContractSiteId || rows[0]?.siteId)],
    );
    if (next === CONTRACT_ORDER_TYPE.PURCHASE_ORDER) {
      setVendorIds((prev) => prev.slice(0, 1));
    }
  };

  const onSaved = async (message: string) => {
    toast.success(message);
    onClose();
    await Promise.all([
      utils.contractOrderQuery.getContractOrders.invalidate({
        work_order_id: workOrderId,
      }),
      utils.contractOrderQuery.getSiteContractOrderItems.invalidate(),
      // A purchase order's cost is recorded at its sites.
      utils.expenseQuery.getExpenses.invalidate(),
      utils.expenseQuery.getExpenseSummary.invalidate(),
      utils.workOrderSiteQuery.getOilZapperStock.invalidate(),
    ]);
  };
  const onError = (error: unknown) => handleError(error, { showToast: true });

  const createOrder =
    trpc.contractOrderMutation.createContractOrder.useMutation({
      onSuccess: () => onSaved("Order added"),
      onError,
    });
  const updateOrder =
    trpc.contractOrderMutation.updateContractOrder.useMutation({
      onSuccess: () => onSaved("Order updated"),
      onError,
    });

  const updateRow = (key: string, change: Partial<ItemRow>) =>
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...change } : row)),
    );
  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((row) => row.key !== key));

  const toggleVendor = (id: number, checked: boolean) =>
    setVendorIds((prev) =>
      checked ? [...prev, id] : prev.filter((vendorId) => vendorId !== id),
    );

  // A purchase order's cost, as it will be recorded at its sites.
  const rate = Number(unitRate) || 0;
  const gst = Number(gstPercentage) || 0;
  const rowAmount = (row: ItemRow) =>
    (Number(row.quantity) || 0) * rate * (1 + gst / 100);
  const totalQuantity = rows.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0,
  );
  const beforeGst = totalQuantity * rate;

  const save = async () => {
    const order = {
      type,
      order_number: orderNumber,
      order_date: orderDate ? new Date(orderDate) : undefined,
      description,
      documents: savedDocuments,
      completion_documents: savedCompletion,
      contractor_ids: vendorIds,
      items: rows.map((row) => ({
        id: row.id,
        work_order_site_id: Number(row.siteId),
        item: row.item,
        description: row.description || undefined,
        quantity: Number(row.quantity),
      })),
      ...(isPurchase && {
        unit_rate: rate || null,
        // Saved as shown: a blank GST is none.
        gst_percentage: gst,
        invoice_number: invoiceNumber,
      }),
    };
    const parsed =
      contractOrderSchemas.baseContractOrderSchema.safeParse(order);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Check the order's details",
      );
      return;
    }

    const uploaded =
      files.length > 0 ? await documentsUpload.uploadFiles(files) : [];
    if (!uploaded) return;
    const uploadedCompletion =
      completionFiles.length > 0
        ? await completionUpload.uploadFiles(completionFiles)
        : [];
    if (!uploadedCompletion) return;

    const values = {
      ...parsed.data,
      documents: [...savedDocuments, ...uploaded.map(toStoredDocument)],
      completion_documents: [
        ...savedCompletion,
        ...uploadedCompletion.map(toStoredDocument),
      ],
    };
    if (editing) {
      updateOrder.mutate({ ...values, id: editing.id });
    } else {
      createOrder.mutate({ ...values, work_order_id: workOrderId });
    }
  };

  const isSaving =
    documentsUpload.isUploading ||
    completionUpload.isUploading ||
    createOrder.isPending ||
    updateOrder.isPending;

  const siteSelect = (value: string, onChange: (siteId: string) => void) => (
    <Select
      value={value}
      onValueChange={onChange}>
      <SelectTrigger className='h-9 w-full bg-white'>
        <SelectValue
          placeholder={sites.length === 0 ? "No sites yet" : "Site"}
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
  );

  const noVendorsText = vendorsQuery.isLoading
    ? "Loading vendors..."
    : "No vendors yet. Add them on the Vendors page.";

  return (
    <DialogWindow
      title={editing ? "Edit Order" : "New Order"}
      description='A purchase order buys oil zapper from one vendor; a sub-contract gives out work at one site'
      size='xl'
      heightMode='full'
      open={open}
      setOpen={(next) => {
        if (!next && !isSaving) onClose();
      }}>
      <div className='space-y-4 py-2'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <div>
            <label className={fieldLabel}>Order type</label>
            <Select
              value={type}
              onValueChange={(value) => changeType(value as OrderType)}>
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
              placeholder={isPurchase ? "e.g. PO-2026-014" : "e.g. SC-2026-006"}
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

        {isPurchase ? (
          <>
            <section className={sectionClass}>
              <SectionTitle
                title='Vendor'
                description='A purchase order is given to one vendor.'
              />
              <Select
                value={vendorIds.length === 1 ? String(vendorIds[0]) : ""}
                onValueChange={(id) => setVendorIds([Number(id)])}>
                <SelectTrigger className='h-9 w-full sm:w-1/2'>
                  <SelectValue
                    placeholder={
                      vendors.length === 0 ? noVendorsText : "Choose the vendor"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem
                      key={vendor.id}
                      value={String(vendor.id)}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vendorIds.length > 1 && (
                <p className='flex items-center gap-1.5 text-xs text-amber-700'>
                  <AlertTriangle className='size-3.5' />
                  This order has {vendorIds.length} vendors. Choose the one it
                  is given to.
                </p>
              )}
            </section>

            <section className={sectionClass}>
              <SectionTitle
                title='Oil zapper by site'
                description={`How many ${OIL_ZAPPER.UNIT} each site gets.`}
                action={
                  <AddRowButton
                    label='Add site'
                    onClick={() => setRows((prev) => [...prev, newRow(type)])}
                  />
                }
              />
              <div className='space-y-2'>
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className='grid grid-cols-1 items-center gap-2 rounded-lg border bg-gray-50/50 p-2 sm:grid-cols-[1fr_10rem_10rem_32px]'>
                    <div className='min-w-0'>
                      {siteSelect(row.siteId, (siteId) =>
                        updateRow(row.key, { siteId }),
                      )}
                      {row.item !== OIL_ZAPPER.KEY && (
                        <p className='mt-1 text-[11px] text-amber-700'>
                          Was {itemLabel(row.item, row.description)}: a purchase
                          order only buys oil zapper.
                        </p>
                      )}
                    </div>
                    <div className='relative'>
                      <Input
                        inputMode='decimal'
                        value={row.quantity}
                        onChange={decimalInput((quantity) =>
                          updateRow(row.key, { quantity }),
                        )}
                        placeholder='Quantity'
                        className='h-9 bg-white pr-9'
                      />
                      <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400'>
                        {OIL_ZAPPER.UNIT}
                      </span>
                    </div>
                    <p className='px-1 text-right text-sm tabular-nums text-gray-700'>
                      {rate > 0 && Number(row.quantity) > 0 ? (
                        formatAmount(rowAmount(row))
                      ) : (
                        <span className='text-gray-300'>—</span>
                      )}
                    </p>
                    <RemoveRowButton
                      disabled={rows.length === 1}
                      onClick={() => removeRow(row.key)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section className={sectionClass}>
              <SectionTitle
                title='Cost'
                description="Recorded as an oil zapper expense at each site, under the order's vendor."
              />
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                <div>
                  <label className={fieldLabel}>
                    Rate per {OIL_ZAPPER.UNIT} (before GST)
                  </label>
                  <div className='relative'>
                    <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
                      ₹
                    </span>
                    <Input
                      inputMode='decimal'
                      value={unitRate}
                      onChange={decimalInput(setUnitRate)}
                      placeholder='0.00'
                      className='h-9 pl-7'
                    />
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>GST</label>
                  <div className='relative'>
                    <Input
                      inputMode='decimal'
                      value={gstPercentage}
                      onChange={decimalInput(setGstPercentage)}
                      className='h-9 pr-8'
                    />
                    <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
                      %
                    </span>
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>Invoice number</label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder='Optional'
                    className='h-9'
                  />
                </div>
              </div>
              <dl className='grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-gray-50 px-4 py-3 text-sm sm:grid-cols-4'>
                <div>
                  <dt className='text-xs text-gray-500'>Oil zapper</dt>
                  <dd className='tabular-nums text-gray-900'>
                    {totalQuantity.toLocaleString("en-IN")} {OIL_ZAPPER.UNIT}
                  </dd>
                </div>
                <div>
                  <dt className='text-xs text-gray-500'>Before GST</dt>
                  <dd className='tabular-nums text-gray-900'>
                    {formatAmount(beforeGst)}
                  </dd>
                </div>
                <div>
                  <dt className='text-xs text-gray-500'>GST ({gst}%)</dt>
                  <dd className='tabular-nums text-gray-900'>
                    {formatAmount((beforeGst * gst) / 100)}
                  </dd>
                </div>
                <div>
                  <dt className='text-xs text-gray-500'>Total</dt>
                  <dd className='font-semibold tabular-nums text-gray-900'>
                    {formatAmount(beforeGst * (1 + gst / 100))}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        ) : (
          <>
            <section className={sectionClass}>
              <SectionTitle
                title='Site and vendors'
                description='A sub-contract gives out work at one site. Its expenses are recorded at the site, under these vendors.'
              />
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
                <div>
                  <label className={fieldLabel}>Site</label>
                  {siteSelect(subContractSiteId, (siteId) =>
                    setRows((prev) => prev.map((row) => ({ ...row, siteId }))),
                  )}
                  {hasMixedSites && (
                    <p className='mt-1 flex items-start gap-1.5 text-[11px] text-amber-700'>
                      <AlertTriangle className='mt-px size-3.5 shrink-0' />
                      This order covers several sites. Choose the one it is for.
                    </p>
                  )}
                </div>
                <div>
                  <label className={fieldLabel}>Vendors</label>
                  <div className='max-h-32 overflow-y-auto rounded-lg border bg-white p-2'>
                    {vendors.length === 0 ? (
                      <p className='px-1 py-1 text-xs text-gray-400'>
                        {noVendorsText}
                      </p>
                    ) : (
                      <div className='grid grid-cols-1 gap-1 sm:grid-cols-2'>
                        {vendors.map((vendor) => (
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
              </div>
            </section>

            <section className={sectionClass}>
              <SectionTitle
                title='Requirements'
                description='What the sub-contract gives out at the site.'
                action={
                  <AddRowButton
                    label='Add requirement'
                    onClick={() =>
                      setRows((prev) => [
                        ...prev,
                        newRow(type, subContractSiteId),
                      ])
                    }
                  />
                }
              />
              <div className='space-y-2'>
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className='grid grid-cols-1 items-start gap-2 rounded-lg border bg-gray-50/50 p-2 sm:grid-cols-[12rem_1fr_9rem_32px]'>
                    <Select
                      value={row.item === OIL_ZAPPER.KEY ? "" : row.item}
                      onValueChange={(item) => updateRow(row.key, { item })}>
                      <SelectTrigger
                        className={cn(
                          "h-9 w-full bg-white",
                          row.item === OIL_ZAPPER.KEY && "border-amber-300",
                        )}>
                        <SelectValue
                          placeholder={
                            row.item === OIL_ZAPPER.KEY
                              ? "Oil zapper: choose another"
                              : "Item"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {SUB_CONTRACT_ITEMS.map((option) => (
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
                        row.item === "other"
                          ? "Describe the item"
                          : "Note (optional)"
                      }
                      disabled={row.item !== "other"}
                      className='h-9 bg-white'
                    />
                    <div className='relative'>
                      <Input
                        inputMode='decimal'
                        value={row.quantity}
                        onChange={decimalInput((quantity) =>
                          updateRow(row.key, { quantity }),
                        )}
                        placeholder='Qty'
                        className='h-9 bg-white pr-16'
                      />
                      <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400'>
                        {itemUnit(row.item)}
                      </span>
                    </div>
                    <RemoveRowButton
                      disabled={rows.length === 1}
                      onClick={() => removeRow(row.key)}
                    />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <section className={sectionClass}>
          <div>
            <label className={fieldLabel}>Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Optional'
              rows={2}
            />
          </div>
          <div className='grid grid-cols-1 gap-3 lg:grid-cols-2'>
            <DocumentsField
              label={`${typeLabel} documents (optional)`}
              files={files}
              onFilesChange={setFiles}
              existing={savedDocuments}
              onRemoveExisting={(index) =>
                setSavedDocuments((prev) => prev.filter((_, i) => i !== index))
              }
              isUploading={documentsUpload.isUploading}
              progress={documentsUpload.progress}
            />
            <DocumentsField
              label='Completion documents (later)'
              files={completionFiles}
              onFilesChange={setCompletionFiles}
              existing={savedCompletion}
              onRemoveExisting={(index) =>
                setSavedCompletion((prev) => prev.filter((_, i) => i !== index))
              }
              isUploading={completionUpload.isUploading}
              progress={completionUpload.progress}
            />
          </div>
          <p className='text-[11px] text-gray-400'>
            Completion documents can be uploaded now or once the work is done,
            from the order&apos;s row.
          </p>
        </section>

        <div className='flex justify-end gap-2 border-t border-gray-100 pt-4'>
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

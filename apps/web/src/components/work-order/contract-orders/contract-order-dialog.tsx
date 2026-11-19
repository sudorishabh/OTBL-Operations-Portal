"use client";
import React, { useEffect, useId, useState } from "react";
import { AlertTriangle, MapPin, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { CODE_PREFIX, constants } from "@pkg/utils";
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
import VendorPicker from "@/components/vendor/vendor-picker";
import { type PickerItem } from "@/components/shared/paged-picker";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  itemLabel,
  singleUnit,
  type ContractOrder,
} from "./contract-orders-section";
import RecordCode from "@/components/shared/record-code";
import OrderSitePicker from "./order-site-picker";

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
  // A purchase order's oil zapper for the site.
  quantity: string;
  // A sub-contract requirement's rate per unit.
  rate: string;
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
  rate: "",
});

const fieldLabel = "mb-1 block text-xs font-medium text-gray-700";
const sectionClass = "space-y-3 border-t border-gray-100 pt-4";

// Each site once, in the order first given.
const uniqueSiteIds = (rows: ItemRow[]) => [
  ...new Set(rows.map((row) => row.siteId).filter(Boolean)),
];

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
// at each site. A sub-contract gives out work at one or more sites to its
// vendors, whose expenses are recorded at each site.
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
  const [orderDate, setOrderDate] = useState("");
  const [description, setDescription] = useState("");
  const [vendors, setVendors] = useState<PickerItem[]>([]);
  const [rows, setRows] = useState<ItemRow[]>([]);
  // The sites chosen, by id, for their names and codes; the picker shows only
  // a page of them at a time.
  const [siteItems, setSiteItems] = useState<Record<string, PickerItem>>({});
  const [unitRate, setUnitRate] = useState("");
  const [gstPercentage, setGstPercentage] = useState(String(GST_PERCENTAGE));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  // A sub-contract whose requirements each take one expense at the site,
  // with its total quantity.
  const [singleExpense, setSingleExpense] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [savedDocuments, setSavedDocuments] = useState<StoredDocument[]>([]);
  const singleExpenseId = useId();

  const isPurchase = type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER;
  const typeLabel = isPurchase ? "Purchase order" : "Sub-contract";
  // A purchase order, and a single-expense sub-contract, go to one vendor.
  const takesOneVendor = isPurchase || singleExpense;

  const documentsUpload = useSharePointUpload({
    folderPath: `/WorkOrders/${workOrderId}/ContractOrders`,
    conflictBehavior: "rename",
  });

  useEffect(() => {
    if (!open) return;
    const startType = editing?.type ?? CONTRACT_ORDER_TYPE.PURCHASE_ORDER;
    setType(startType);
    setOrderDate(
      format(editing ? new Date(editing.order_date) : new Date(), "yyyy-MM-dd"),
    );
    setDescription(editing?.description ?? "");
    setVendors(
      editing?.vendors.map((vendor) => ({
        id: vendor.id,
        code: vendor.code ?? null,
        name: vendor.name,
      })) ?? [],
    );
    setSiteItems(
      Object.fromEntries(
        (editing?.items ?? []).map((item) => [
          String(item.work_order_site_id),
          {
            id: item.work_order_site_id,
            code: item.site_code ?? null,
            name: item.site_name ?? "Site",
          },
        ]),
      ),
    );
    setRows(
      editing?.items.length
        ? editing.items.map((item) => ({
            key: String(item.id),
            id: item.id,
            siteId: String(item.work_order_site_id),
            item: item.item,
            description: item.description ?? "",
            quantity: item.quantity ? String(Number(item.quantity)) : "",
            rate: item.unit_rate ? String(Number(item.unit_rate)) : "",
          }))
        : [],
    );
    setSingleExpense(editing?.single_expense ?? false);
    setUnitRate(editing?.unit_rate ? String(Number(editing.unit_rate)) : "");
    setGstPercentage(
      editing?.gst_percentage != null
        ? String(Number(editing.gst_percentage))
        : String(GST_PERCENTAGE),
    );
    setInvoiceNumber(editing?.invoice_number ?? "");
    setFiles([]);
    setSavedDocuments(toDocuments(editing?.documents));
    documentsUpload.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // The order's sites: those its rows are at, as chosen. A site is chosen
  // with one empty row, and taking it off drops its own.
  const chosenSiteIds = uniqueSiteIds(rows);
  const selectedSites = chosenSiteIds.map(
    (siteId) => siteItems[siteId] ?? { id: Number(siteId), name: "Site" },
  );
  const changeSites = (next: PickerItem[]) => {
    setSiteItems((prev) => ({
      ...prev,
      ...Object.fromEntries(next.map((site) => [String(site.id), site])),
    }));
    const nextIds = new Set(next.map((site) => String(site.id)));
    setRows((prev) => {
      const kept = prev.filter((row) => nextIds.has(row.siteId));
      const have = new Set(kept.map((row) => row.siteId));
      const added = next
        .filter((site) => !have.has(String(site.id)))
        .map((site) => newRow(type, String(site.id)));
      return [...kept, ...added];
    });
  };

  // A site as its rows are headed: its code and name.
  const siteLabel = (siteId: string) => {
    const site = siteItems[siteId];
    return (
      <p className='flex min-w-0 items-center gap-1.5 px-1 text-xs font-medium text-gray-800'>
        <MapPin className='size-3.5 shrink-0 text-gray-400' />
        {site?.code && <RecordCode code={site.code} />}
        <span className='truncate'>{site?.name ?? "Site"}</span>
      </p>
    );
  };

  // Switching type keeps the rows whose items the new type takes, with their
  // ids so their expenses stay linked, such as an older purchase order's JCB
  // becoming a sub-contract's. With none, the sites stay chosen.
  const changeType = (next: OrderType) => {
    if (next === type) return;
    const isNextPurchase = next === CONTRACT_ORDER_TYPE.PURCHASE_ORDER;
    const fitting = rows.filter(
      (row) =>
        CONTRACT_ORDER_ITEMS.find((option) => option.key === row.item)
          ?.orderType === next,
    );
    const siteIds = uniqueSiteIds(rows);
    const kept =
      fitting.length > 0
        ? fitting
        : siteIds.map((siteId) => newRow(next, siteId));
    setType(next);
    setRows(kept);
    if (isNextPurchase) {
      setVendors((prev) => prev.slice(0, 1));
    }
  };

  // Taking one expense per requirement, a sub-contract keeps one vendor, who
  // that expense is under.
  const changeSingleExpense = (next: boolean) => {
    setSingleExpense(next);
    if (next) setVendors((prev) => prev.slice(0, 1));
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
      utils.expenseQuery.getVendorMonthlyExpenses.invalidate(),
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
      order_date: orderDate ? new Date(orderDate) : undefined,
      description,
      documents: savedDocuments,
      contractor_ids: vendors.map((vendor) => vendor.id),
      // A purchase order gives each site's oil zapper; a sub-contract gives
      // each requirement's rate, its quantities recorded at the site.
      items: rows.map((row) => ({
        id: row.id,
        work_order_site_id: Number(row.siteId),
        item: row.item,
        description: row.description || undefined,
        quantity: isPurchase ? Number(row.quantity) || null : null,
        unit_rate: isPurchase ? null : Number(row.rate) || null,
      })),
      ...(isPurchase
        ? {
            unit_rate: rate || null,
            // Saved as shown: a blank GST is none.
            gst_percentage: gst,
            invoice_number: invoiceNumber,
          }
        : { single_expense: singleExpense }),
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

    // Its completion documents are uploaded from its row once the work is
    // done; leaving them out keeps those already saved.
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

  const isSaving =
    documentsUpload.isUploading ||
    createOrder.isPending ||
    updateOrder.isPending;

  // A sub-contract's requirement at one of its sites, at its rate per unit.
  // A site's only one goes when the site is unticked.
  const requirementRow = (row: ItemRow, isSiteOnly: boolean) => (
    <div
      key={row.key}
      className='grid grid-cols-1 items-start gap-2 rounded-lg border bg-gray-50/50 p-2 sm:grid-cols-[12rem_1fr_11rem_32px]'>
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
        onChange={(e) => updateRow(row.key, { description: e.target.value })}
        placeholder={
          row.item === "other" ? "Describe the item" : "Note (optional)"
        }
        disabled={row.item !== "other"}
        className='h-9 bg-white'
      />
      <div className='relative'>
        <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400'>
          ₹
        </span>
        <Input
          inputMode='decimal'
          value={row.rate}
          onChange={decimalInput((rate) => updateRow(row.key, { rate }))}
          placeholder='Rate'
          aria-label='Rate per unit'
          className='h-9 bg-white pl-7 pr-20'
        />
        {row.item && row.item !== OIL_ZAPPER.KEY && (
          <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400'>
            per {singleUnit(itemUnit(row.item))}
          </span>
        )}
      </div>
      <RemoveRowButton
        disabled={isSiteOnly}
        onClick={() => removeRow(row.key)}
      />
    </div>
  );

  return (
    <DialogWindow
      title={editing ? "Edit Order" : "New Order"}
      description='A purchase order buys oil zapper from one vendor; a sub-contract gives out work at one or more sites'
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
          {/* Given as the order is saved, and again if it changes type. */}
          <div>
            <span className={fieldLabel}>Code</span>
            <p className='flex h-9 items-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 text-sm text-gray-500'>
              {editing && editing.type === type ? (
                <span className='font-mono font-medium text-gray-900'>
                  {editing.code}
                </span>
              ) : (
                `A new ${isPurchase ? CODE_PREFIX.PURCHASE_ORDER : CODE_PREFIX.SUB_CONTRACT} code, given when saved`
              )}
            </p>
            {editing?.order_number && (
              <p className='mt-1 text-[11px] text-gray-400'>
                Typed as {editing.order_number} before orders had codes
              </p>
            )}
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

        {/* Who and where, picked a page at a time. */}
        <section className={sectionClass}>
          <SectionTitle
            title={takesOneVendor ? "Sites and vendor" : "Sites and vendors"}
            description={
              isPurchase
                ? "A purchase order buys oil zapper for one or more sites, from one vendor."
                : singleExpense
                  ? "A sub-contract gives out work at one or more sites. Its expenses are recorded at each site, under its vendor."
                  : "A sub-contract gives out work at one or more sites. Its expenses are recorded at each site, under these vendors."
            }
          />
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <OrderSitePicker
              workOrderId={workOrderId}
              selected={selectedSites}
              onChange={changeSites}
            />
            <VendorPicker
              mode={takesOneVendor ? "single" : "multiple"}
              selected={vendors}
              onChange={setVendors}
            />
          </div>
          {takesOneVendor && vendors.length > 1 && (
            <p className='flex items-center gap-1.5 text-xs text-amber-700'>
              <AlertTriangle className='size-3.5' />
              This order has {vendors.length} vendors. Choose the one it is
              given to.
            </p>
          )}
        </section>

        {isPurchase ? (
          <>
            <section className={sectionClass}>
              <SectionTitle
                title='Oil zapper by site'
                description={`How many ${OIL_ZAPPER.UNIT} each chosen site gets.`}
              />
              {rows.length === 0 && (
                <p className='rounded-lg border border-dashed px-3 py-4 text-center text-xs text-gray-400'>
                  Choose the sites the order buys oil zapper for, then give each
                  its quantity.
                </p>
              )}
              <div className='space-y-2'>
                {rows.map((row) => (
                  <div
                    key={row.key}
                    className='grid grid-cols-1 items-center gap-2 rounded-lg border bg-gray-50/50 p-2 sm:grid-cols-[1fr_10rem_10rem_32px]'>
                    <div className='min-w-0'>
                      {siteLabel(row.siteId)}
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
                    {/* Takes the site off the order. */}
                    <RemoveRowButton
                      disabled={false}
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
                title='Requirements'
                description='What the sub-contract gives out at each of its sites, at a rate per unit. The quantity is recorded with its expenses at the site.'
              />
              <div className='flex items-start gap-3 rounded-lg border bg-gray-50/50 px-3 py-2.5'>
                <Switch
                  id={singleExpenseId}
                  checked={singleExpense}
                  onCheckedChange={changeSingleExpense}
                  className='mt-0.5'
                />
                <label
                  htmlFor={singleExpenseId}
                  className='min-w-0 cursor-pointer'>
                  <span className='block text-sm font-medium text-gray-900'>
                    One expense per requirement
                  </span>
                  <span className='block text-xs text-gray-500'>
                    {singleExpense
                      ? "Each requirement takes one expense at its site, with the total quantity, such as JCB 70 hours. The sub-contract goes to one vendor."
                      : "Each requirement takes as many expenses at its site as needed, each with its own quantity, such as JCB 20 hours, then 50 hours."}
                  </span>
                </label>
              </div>
              {chosenSiteIds.length === 0 ? (
                <p className='rounded-lg border border-dashed px-3 py-4 text-center text-xs text-gray-400'>
                  Choose the sites the sub-contract is for, then add what it
                  requires at each.
                </p>
              ) : (
                <div className='space-y-4'>
                  {chosenSiteIds.map((siteId) => {
                    const siteRows = rows.filter(
                      (row) => row.siteId === siteId,
                    );
                    return (
                      <div
                        key={siteId}
                        className='space-y-2'>
                        <div className='flex items-center justify-between gap-3'>
                          {siteLabel(siteId)}
                          <AddRowButton
                            label='Add requirement'
                            onClick={() =>
                              setRows((prev) => [...prev, newRow(type, siteId)])
                            }
                          />
                        </div>
                        {siteRows.map((row) =>
                          requirementRow(row, siteRows.length === 1),
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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

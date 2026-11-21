"use client";
import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  FileText,
  HardHat,
  MapPin,
  Pencil,
  Receipt,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useIsViewer } from "@/contexts/AuthContext";
import { toDocuments } from "@/lib/documents";
import { formatDateRange } from "@/lib/wo-site-display";
import DialogWindow from "@/components/shared/dialog-window";
import CustomButton from "@/components/shared/btn";
import DocumentsMenu from "@/components/shared/documents-menu";
import { ALL, SelectFilter } from "@/components/filters/list-filters";
import {
  formatAmount,
  formatQuantity,
  itemLabel,
  orderTypeOf,
  purchaseOrderCost,
  requirementTerms,
  type ContractOrder,
  type OrderItem,
} from "./contract-order-display";
import OrderCompletionDocuments from "./order-completion-documents";

// An expense recorded against one of the order's requirements.
interface OrderExpense {
  id: number;
  contract_order_item_id: number | null;
  work_order_site_id: number;
  description: string | null;
  amount: number;
  quantity: number | null;
  start_date: string | Date;
  end_date: string | Date;
  invoice_number: string | null;
  is_exceeded: boolean;
  // Recorded by a purchase order from its rate, not at the site.
  from_order: boolean;
  documents: unknown;
  vendor_id: number | null;
  vendor_name: string | null;
}

// What getContractOrderDetails sends; the app's tRPC client is untyped.
type OrderDetails = ContractOrder & { expenses: OrderExpense[] };

interface Props {
  workOrderId: number;
  // The order shown; the dialog is closed while there's none.
  orderId: number | null;
  onClose: () => void;
  // Opens the order's edit form.
  onEdit: (order: ContractOrder) => void;
}

// What was recorded against a requirement, or by a vendor on one.
type Tally = { amount: number; quantity: number; count: number };

const NO_TALLY: Tally = { amount: 0, quantity: 0, count: 0 };

const add = (tally: Tally | undefined, expense: OrderExpense): Tally => ({
  amount: (tally?.amount ?? 0) + expense.amount,
  quantity: (tally?.quantity ?? 0) + (expense.quantity ?? 0),
  count: (tally?.count ?? 0) + 1,
});

const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;

const NO_VENDOR = "none";

const SectionTitle = ({
  Icon,
  title,
  meta,
  children,
}: {
  Icon: React.ElementType;
  title: string;
  meta?: string;
  children?: React.ReactNode;
}) => (
  <div className='mb-2 flex flex-wrap items-center gap-x-3 gap-y-2'>
    <h3 className='flex items-center gap-2 text-sm font-semibold text-gray-900'>
      <Icon className='size-4 text-gray-400' />
      {title}
    </h3>
    {meta && <span className='text-xs text-gray-500'>{meta}</span>}
    {children && (
      <div className='ml-auto flex flex-wrap items-center gap-2'>
        {children}
      </div>
    )}
  </div>
);

const Tile = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) => (
  <div className='min-w-0 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2.5'>
    <p className='text-xs text-gray-500'>{label}</p>
    <p className='mt-0.5 truncate text-lg font-semibold tabular-nums text-gray-900'>
      {value}
    </p>
    {hint && <p className='truncate text-xs text-gray-500'>{hint}</p>}
  </div>
);

// A requirement's site and what it is, on one line.
const RequirementName = ({ item }: { item?: OrderItem }) =>
  item ? (
    <span className='inline-flex min-w-0 items-center gap-1'>
      <MapPin className='size-3 shrink-0 text-gray-400' />
      <span className='truncate text-gray-500'>{item.site_name ?? "Site"}</span>
      <span className='text-gray-300'>·</span>
      <span className='truncate font-medium text-gray-700'>
        {itemLabel(item.item, item.description)}
      </span>
    </span>
  ) : (
    <span className='text-gray-400'>Removed requirement</span>
  );

const headClass =
  "px-3 py-2 text-left text-xs font-medium text-gray-500 first:pl-4 last:pr-4";
const cellClass = "px-3 py-2.5 align-top first:pl-4 last:pr-4";

// Everything about a purchase order or sub-contract: its details and
// documents, what it requires at each site, what each vendor has done under
// it, and every expense recorded against it. Opens when an order is added,
// and from the orders list.
const ContractOrderDetailsDialog = ({
  workOrderId,
  orderId,
  onClose,
  onEdit,
}: Props) => {
  const isViewer = useIsViewer();
  const [vendorFilter, setVendorFilter] = useState(ALL);
  const [siteFilter, setSiteFilter] = useState(ALL);

  const detailsQuery = trpc.contractOrderQuery.getContractOrderDetails.useQuery(
    { id: orderId ?? 0 },
    { enabled: !!orderId },
  );
  const order = detailsQuery.data as OrderDetails | undefined;

  const items = useMemo(() => order?.items ?? [], [order]);
  const expenses = useMemo(() => order?.expenses ?? [], [order]);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  // What was recorded against each requirement.
  const byItem = useMemo(() => {
    const tallies = new Map<number, Tally>();
    for (const expense of expenses) {
      const id = expense.contract_order_item_id;
      if (id) tallies.set(id, add(tallies.get(id), expense));
    }
    return tallies;
  }, [expenses]);

  // Each vendor the order is given to, and any other an expense names,
  // with what they recorded on each requirement.
  const vendorActivity = useMemo(() => {
    const vendors = new Map<
      string,
      {
        key: string;
        name: string;
        code?: string;
        total: Tally;
        byItem: Map<number, Tally>;
      }
    >();
    for (const vendor of order?.vendors ?? []) {
      vendors.set(String(vendor.id), {
        key: String(vendor.id),
        name: vendor.name,
        code: vendor.code,
        total: NO_TALLY,
        byItem: new Map(),
      });
    }
    for (const expense of expenses) {
      const key = expense.vendor_id ? String(expense.vendor_id) : NO_VENDOR;
      const vendor = vendors.get(key) ?? {
        key,
        name: expense.vendor_name ?? "No vendor",
        total: NO_TALLY,
        byItem: new Map(),
      };
      vendor.total = add(vendor.total, expense);
      const itemId = expense.contract_order_item_id;
      if (itemId)
        vendor.byItem.set(itemId, add(vendor.byItem.get(itemId), expense));
      vendors.set(key, vendor);
    }
    return [...vendors.values()];
  }, [order, expenses]);

  const sites = useMemo(() => {
    const names = new Map<string, string>();
    for (const item of items) {
      names.set(String(item.work_order_site_id), item.site_name ?? "Site");
    }
    return [...names].map(([value, label]) => ({ value, label }));
  }, [items]);

  const shownExpenses = expenses.filter(
    (expense) =>
      (vendorFilter === ALL ||
        (expense.vendor_id ? String(expense.vendor_id) : NO_VENDOR) ===
          vendorFilter) &&
      (siteFilter === ALL || String(expense.work_order_site_id) === siteFilter),
  );

  const close = () => {
    setVendorFilter(ALL);
    setSiteFilter(ALL);
    onClose();
  };

  const group = order ? orderTypeOf(order.type) : null;
  const cost = order ? purchaseOrderCost(order) : null;
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const shownTotal = shownExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const exceededCount = expenses.filter(
    (expense) => expense.is_exceeded,
  ).length;
  const documents = toDocuments(order?.documents);
  const isPurchase = order?.type === "purchase_order";

  return (
    <DialogWindow
      title={order ? `${order.code} · ${group?.label}` : "Order details"}
      description={
        order
          ? [
              `Dated ${format(new Date(order.order_date), "d MMM yyyy")}`,
              order.order_number && `Ref. ${order.order_number}`,
              order.invoice_number && `Invoice ${order.invoice_number}`,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
      size='xl'
      heightMode='fixed'
      open={!!orderId}
      setOpen={(next) => {
        if (!next) close();
      }}
      isLoading={detailsQuery.isLoading}
      loadingSkeleton='list'>
      {detailsQuery.isError || (!detailsQuery.isLoading && !order) ? (
        <p className='rounded-lg border border-dashed py-8 text-center text-sm text-gray-500'>
          This order couldn&apos;t be loaded. It may have been deleted.
        </p>
      ) : order && group ? (
        <div className='space-y-6 pb-2'>
          {/* What it is, its completion and paperwork, and editing it. */}
          <div className='flex flex-wrap items-center gap-2'>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                group.tone,
              )}>
              <group.Icon className='size-3.5' />
              {group.label}
            </span>
            <OrderCompletionDocuments
              workOrderId={workOrderId}
              order={order}
            />
            {order.single_expense && (
              <span className='rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200'>
                One expense per requirement
              </span>
            )}
            <div className='ml-auto flex items-center gap-2'>
              {documents.length > 0 && (
                <DocumentsMenu documents={documents}>
                  <button
                    type='button'
                    className='inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-xs hover:bg-gray-50'>
                    <FileText className='size-3.5 text-gray-400' />
                    {plural(documents.length, "document")}
                  </button>
                </DocumentsMenu>
              )}
              {!isViewer && (
                <CustomButton
                  variant='outline'
                  Icon={Pencil}
                  text='Edit order'
                  onClick={() => onEdit(order)}
                  className='h-8 text-xs'
                />
              )}
            </div>
          </div>

          {order.description && (
            <p className='whitespace-pre-line text-sm text-gray-600'>
              {order.description}
            </p>
          )}

          <div
            className={cn(
              "grid grid-cols-2 gap-3",
              cost ? "lg:grid-cols-4" : "lg:grid-cols-3",
            )}>
            {cost && (
              <Tile
                label='Order value, with GST'
                value={formatAmount(cost.total)}
                hint={`${formatQuantity(cost.quantity)} kg × ${formatAmount(cost.rate)} + ${cost.gst}% GST`}
              />
            )}
            <Tile
              label='Spent so far'
              value={formatAmount(spent)}
              hint={
                exceededCount > 0 ? (
                  <span className='text-amber-700'>
                    {plural(expenses.length, "expense")}, {exceededCount} over
                    the estimate
                  </span>
                ) : (
                  plural(expenses.length, "expense")
                )
              }
            />
            <Tile
              label='Sites'
              value={sites.length}
              hint={plural(items.length, "requirement")}
            />
            <Tile
              label='Vendors'
              value={order.vendors.length}
              hint={
                order.vendors.map((vendor) => vendor.name).join(", ") ||
                "None given"
              }
            />
          </div>

          {/* What the order asks of each site, and what has been recorded. */}
          <section>
            <SectionTitle
              Icon={MapPin}
              title='Requirements by site'
              meta={`${plural(items.length, "requirement")} at ${plural(sites.length, "site")}`}
            />
            <div className='overflow-x-auto rounded-lg border border-gray-200'>
              <table className='w-full min-w-[36rem] text-sm'>
                <thead className='border-b border-gray-200 bg-gray-50'>
                  <tr>
                    <th className={headClass}>Site</th>
                    <th className={headClass}>Requirement</th>
                    <th className={cn(headClass, "text-right")}>
                      {isPurchase ? "Ordered" : "Rate"}
                    </th>
                    <th className={cn(headClass, "text-right")}>Recorded</th>
                    <th className={cn(headClass, "text-right")}>Expenses</th>
                    <th className={cn(headClass, "text-right")}>Spent</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {items.map((item) => {
                    const tally = byItem.get(item.id) ?? NO_TALLY;
                    return (
                      <tr key={item.id}>
                        <td className={cn(cellClass, "text-gray-700")}>
                          {item.site_name ?? "Site"}
                          {item.site_code && (
                            <span className='ml-1.5 font-mono text-[11px] text-gray-400'>
                              {item.site_code}
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            cellClass,
                            "font-medium text-gray-900",
                          )}>
                          {itemLabel(item.item, item.description)}
                        </td>
                        <td
                          className={cn(
                            cellClass,
                            "text-right tabular-nums text-gray-600",
                          )}>
                          {requirementTerms(order, item)}
                        </td>
                        <td
                          className={cn(
                            cellClass,
                            "text-right tabular-nums text-gray-600",
                          )}>
                          {tally.quantity > 0
                            ? `${formatQuantity(tally.quantity)} ${item.unit}`
                            : "—"}
                        </td>
                        <td
                          className={cn(
                            cellClass,
                            "text-right tabular-nums text-gray-600",
                          )}>
                          {tally.count || "—"}
                        </td>
                        <td
                          className={cn(
                            cellClass,
                            "text-right font-medium tabular-nums text-gray-900",
                          )}>
                          {tally.count ? formatAmount(tally.amount) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className='border-t border-gray-200 bg-gray-50/60'>
                  <tr>
                    <td
                      colSpan={5}
                      className={cn(
                        cellClass,
                        "text-right text-xs font-medium text-gray-600",
                      )}>
                      Spent on this order
                    </td>
                    <td
                      className={cn(
                        cellClass,
                        "text-right font-semibold tabular-nums text-gray-900",
                      )}>
                      {formatAmount(spent)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* What each vendor has done under the order. */}
          <section>
            <SectionTitle
              Icon={HardHat}
              title='Vendor activities'
              meta={plural(vendorActivity.length, "vendor")}
            />
            {vendorActivity.length === 0 ? (
              <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-500'>
                No vendors are given this order.
              </p>
            ) : (
              <div className='grid gap-3 lg:grid-cols-2'>
                {vendorActivity.map((vendor) => (
                  <div
                    key={vendor.key}
                    className='rounded-lg border border-gray-200 p-3'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold text-gray-900'>
                          {vendor.name}
                        </p>
                        {vendor.code && (
                          <p className='font-mono text-[11px] text-gray-400'>
                            {vendor.code}
                          </p>
                        )}
                      </div>
                      <div className='shrink-0 text-right'>
                        <p className='text-sm font-semibold tabular-nums text-gray-900'>
                          {formatAmount(vendor.total.amount)}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {plural(vendor.total.count, "expense")}
                        </p>
                      </div>
                    </div>
                    {vendor.byItem.size === 0 ? (
                      <p className='mt-2 text-xs text-gray-400'>
                        Nothing recorded under this vendor yet.
                      </p>
                    ) : (
                      <ul className='mt-2 space-y-1 border-t border-gray-100 pt-2'>
                        {[...vendor.byItem].map(([itemId, tally]) => {
                          const item = itemById.get(itemId);
                          return (
                            <li
                              key={itemId}
                              className='flex items-center gap-3 text-xs'>
                              <span className='min-w-0 flex-1'>
                                <RequirementName item={item} />
                              </span>
                              {tally.quantity > 0 && item && (
                                <span className='shrink-0 tabular-nums text-gray-500'>
                                  {formatQuantity(tally.quantity)} {item.unit}
                                </span>
                              )}
                              <span className='w-24 shrink-0 text-right font-medium tabular-nums text-gray-800'>
                                {formatAmount(tally.amount)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Every expense recorded against the order. */}
          <section>
            <SectionTitle
              Icon={Receipt}
              title='Expenses'
              meta={
                shownExpenses.length === expenses.length
                  ? plural(expenses.length, "expense")
                  : `${shownExpenses.length} of ${expenses.length}`
              }>
              {vendorActivity.length > 1 && (
                <SelectFilter
                  label='Vendor'
                  Icon={HardHat}
                  value={vendorFilter}
                  onChange={setVendorFilter}
                  options={[
                    { value: ALL, label: "All vendors" },
                    ...vendorActivity.map((vendor) => ({
                      value: vendor.key,
                      label: vendor.name,
                    })),
                  ]}
                />
              )}
              {sites.length > 1 && (
                <SelectFilter
                  label='Site'
                  Icon={MapPin}
                  value={siteFilter}
                  onChange={setSiteFilter}
                  options={[{ value: ALL, label: "All sites" }, ...sites]}
                />
              )}
            </SectionTitle>
            {expenses.length === 0 ? (
              <p className='rounded-lg border border-dashed py-6 text-center text-xs text-gray-500'>
                No expenses recorded against this order yet. They&apos;re added
                from each site&apos;s Expenses tab.
              </p>
            ) : (
              <div className='overflow-x-auto rounded-lg border border-gray-200'>
                <table className='w-full min-w-[36rem] text-sm'>
                  <thead className='border-b border-gray-200 bg-gray-50'>
                    <tr>
                      <th className={headClass}>Dated</th>
                      <th className={headClass}>Requirement</th>
                      <th className={headClass}>Vendor</th>
                      <th className={headClass}>Expense</th>
                      <th className={cn(headClass, "text-right")}>Quantity</th>
                      <th className={cn(headClass, "text-right")}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {shownExpenses.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className='py-6 text-center text-xs text-gray-500'>
                          No expenses match these filters.
                        </td>
                      </tr>
                    )}
                    {shownExpenses.map((expense) => {
                      const item = expense.contract_order_item_id
                        ? itemById.get(expense.contract_order_item_id)
                        : undefined;
                      const expenseDocuments = toDocuments(expense.documents);
                      return (
                        <tr key={expense.id}>
                          <td
                            className={cn(
                              cellClass,
                              "whitespace-nowrap text-xs text-gray-600",
                            )}>
                            {formatDateRange(
                              expense.start_date,
                              expense.end_date,
                            )}
                          </td>
                          <td
                            className={cn(cellClass, "max-w-[16rem] text-xs")}>
                            <RequirementName item={item} />
                          </td>
                          <td
                            className={cn(
                              cellClass,
                              "max-w-[12rem] truncate text-xs text-gray-700",
                            )}>
                            {expense.vendor_name ?? (
                              <span className='text-gray-400'>No vendor</span>
                            )}
                          </td>
                          <td className={cn(cellClass, "min-w-[12rem]")}>
                            <p className='text-sm text-gray-900'>
                              {expense.description ?? (
                                <span className='text-gray-400'>
                                  No description
                                </span>
                              )}
                            </p>
                            <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500'>
                              {expense.invoice_number && (
                                <span>Invoice {expense.invoice_number}</span>
                              )}
                              {expense.from_order && (
                                <span className='rounded bg-sky-50 px-1.5 text-sky-700'>
                                  From the order&apos;s rate
                                </span>
                              )}
                              {expense.is_exceeded && (
                                <span className='inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 text-amber-700'>
                                  <AlertTriangle className='size-3' />
                                  Over the estimate
                                </span>
                              )}
                              {expenseDocuments.length > 0 && (
                                <DocumentsMenu documents={expenseDocuments}>
                                  <button
                                    type='button'
                                    className='inline-flex cursor-pointer items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800'>
                                    <FileText className='size-3' />
                                    {plural(
                                      expenseDocuments.length,
                                      "document",
                                    )}
                                  </button>
                                </DocumentsMenu>
                              )}
                            </div>
                          </td>
                          <td
                            className={cn(
                              cellClass,
                              "whitespace-nowrap text-right text-xs tabular-nums text-gray-600",
                            )}>
                            {expense.quantity !== null && item
                              ? `${formatQuantity(expense.quantity)} ${item.unit}`
                              : "—"}
                          </td>
                          <td
                            className={cn(
                              cellClass,
                              "whitespace-nowrap text-right font-medium tabular-nums text-gray-900",
                            )}>
                            {formatAmount(expense.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {shownExpenses.length > 0 && (
                    <tfoot className='border-t border-gray-200 bg-gray-50/60'>
                      <tr>
                        <td
                          colSpan={5}
                          className={cn(
                            cellClass,
                            "text-right text-xs font-medium text-gray-600",
                          )}>
                          {shownExpenses.length === expenses.length
                            ? "Total"
                            : "Total of these"}
                        </td>
                        <td
                          className={cn(
                            cellClass,
                            "text-right font-semibold tabular-nums text-gray-900",
                          )}>
                          {formatAmount(shownTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </DialogWindow>
  );
};

export default ContractOrderDetailsDialog;

"use client";
import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { capitalFirstLetter, constants } from "@pkg/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  HardHat,
  Paperclip,
  ReceiptIndianRupee,
  AlertTriangle,
  CalendarRange,
  ChevronRight,
  FileText,
  ShoppingCart,
  Wrench,
  ClipboardList,
  Lock,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import CustomButton from "@/components/shared/btn";
import { cn } from "@/lib/utils";
import { useIsViewer } from "@/contexts/AuthContext";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import AddExpenseDialog, {
  ActivityOption,
  Expense,
  OrderItemOption,
} from "./add-expense-dialog";
import DocumentsMenu from "@/components/shared/documents-menu";
import {
  itemLabel,
  rateLabel,
} from "../contract-orders/contract-orders-section";
import type { JobOrder } from "../restoration/job-order-dialog";
import JobOrderChip from "../restoration/job-order-chip";
import {
  isJobOrderClosed,
  jobOrderPlace,
  jobOrderSorActivities,
} from "../restoration/restoration-display";
import {
  documentName,
  openDocument,
  toDocuments,
  type StoredDocument,
} from "@/lib/documents";
import { differenceInCalendarDays, format, isSameDay } from "date-fns";
import { formatDateRange } from "@/lib/wo-site-display";
import { ExpenseGroupsSkeleton } from "@/components/skeleton/work-order/site-skeletons";
import VendorMonthlyExpensesDialog from "./vendor-monthly-expenses-dialog";

type ExpenseRecord = {
  id: number;
  activityKey: string | null;
  activityLabel: string;
  unit: string | null;
  startDate: string | Date;
  endDate: string | Date;
  quantity: string | null;
  isExceeded: boolean;
  title: string;
  contractorId: number | null;
  contractorName: string | null;
  contractOrderItemId: number | null;
  // Recorded by its purchase order, so changed only there.
  fromOrder: boolean;
  jobOrderId: number | null;
  invoiceNumber: string | null;
  documents: StoredDocument[];
  amount: number;
  recordedBy: string | null;
  recordedAt: string | Date | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

// What a contract order requires at the site, as getSiteContractOrderItems
// returns it: a purchase order's oil zapper, or a sub-contract's rate.
type SiteOrderItem = {
  id: number;
  contract_order_id: number;
  item: string;
  description: string | null;
  quantity: string | null;
  unit: string;
  unit_rate: string | null;
  order_type: string;
  order_code: string;
  // Its sub-contract takes one expense per requirement.
  single_expense: boolean;
  // The expenses recorded against it at the site.
  expense_count: number;
  vendors: { id: number; name: string }[];
};

const ORDER_GROUPS = [
  {
    type: constants.CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
    title: "Purchase orders",
    noun: "purchase order",
    Icon: ShoppingCart,
  },
  {
    type: constants.CONTRACT_ORDER_TYPE.SUB_CONTRACT,
    title: "Sub-contracts",
    noun: "sub-contract",
    Icon: Wrench,
  },
] as const;

// The site's requirements of the given type, by order, each order's in the
// order they come.
const itemsByOrder = (items: SiteOrderItem[], type: string) => {
  const byOrder = new Map<number, SiteOrderItem[]>();
  for (const item of items) {
    if (item.order_type !== type) continue;
    byOrder.set(item.contract_order_id, [
      ...(byOrder.get(item.contract_order_id) ?? []),
      item,
    ]);
  }
  return [...byOrder.values()];
};

// A requirement as the expense dialog offers it. A single-expense one with
// its one recorded is taken, unless that is the expense being edited.
const toItemOption = (
  item: SiteOrderItem,
  editing: Expense | null,
): OrderItemOption => ({
  id: item.id,
  label: itemLabel(item.item, item.description),
  unitRate: item.unit_rate ? Number(item.unit_rate) : null,
  unit: item.unit,
  singleExpense: item.single_expense,
  isTaken:
    item.single_expense &&
    item.expense_count > 0 &&
    editing?.contract_order_item_id !== item.id,
});

// What an order asks of the site: a purchase order's oil zapper, or a
// sub-contract's rate.
const orderItemTerms = (item: SiteOrderItem) => {
  if (item.order_type === constants.CONTRACT_ORDER_TYPE.PURCHASE_ORDER) {
    return `${formatQty(Number(item.quantity ?? 0))} ${item.unit}`;
  }
  return item.unit_rate ? rateLabel(item.unit_rate, item.unit) : "No rate";
};

// The tabs of expenses under no vendor, and of vendor expenses in no group,
// when expenses are shown in tabs.
const MISCELLANEOUS_TAB = "miscellaneous";
const UNASSIGNED_TAB = "unassigned";

// Tighter than the table defaults, so a record takes one compact row.
const headClass =
  "h-8 px-3 sm:h-8 sm:px-3 text-[11px] font-medium text-gray-400 whitespace-nowrap";
const cellClass = "px-3 py-2.5 sm:px-3 sm:py-2.5";
// Every total lines up with the expenses' amounts: an expense's edit and
// delete buttons take the last column, and a header keeps the same room after
// its total, less its own padding, for its menu.
const actionsColumnClass = "w-20";
const menuSlotClass = "flex w-17 shrink-0 justify-end";

const formatFullDates = (start: string | Date, end: string | Date) => {
  const from = new Date(start);
  const to = new Date(end);
  if (isSameDay(from, to)) return `${format(from, "d MMM yyyy")} (1 day)`;
  const days = differenceInCalendarDays(to, from) + 1;
  return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")} (${days} days)`;
};

const Detail = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("min-w-0", className)}>
    <dt className='text-xs text-gray-500'>{label}</dt>
    <dd className='mt-0.5 text-sm text-gray-800'>{children}</dd>
  </div>
);

const formatActivityLabel = (key: string) =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

interface Props {
  woSiteId: number;
  processType?: string;
  // Off when the caller already shows estimated, used and left quantities.
  showEstimateTable?: boolean;
  // Extra buttons beside Add Expense.
  headerActions?: React.ReactNode;
  // Each restoration job order's status, such as its certificates, and its
  // menu, such as edit and delete.
  jobOrderStatus?: (jobOrder: JobOrder) => React.ReactNode;
  jobOrderActions?: (jobOrder: JobOrder) => React.ReactNode;
}

const SiteExpensesSection = ({
  woSiteId,
  processType,
  showEstimateTable = true,
  headerActions,
  jobOrderStatus,
  jobOrderActions,
}: Props) => {
  const utils = trpc.useUtils();
  const isViewer = useIsViewer();
  const [dialogOpen, setDialogOpen] = useState(false);
  // Each vendor's spend, month by month.
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // The expense whose full details are open under its row.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>("__all__");
  // What a new expense starts under, when added from a vendor or from
  // Miscellaneous.
  const [addUnder, setAddUnder] = useState<number | "miscellaneous" | null>(null);
  // The contract order a bioremediation expense is spent on, one of whose
  // requirements is picked in the dialog, or the job order a restoration one
  // is.
  const [dialogOrderId, setDialogOrderId] = useState<number | null>(null);
  const [dialogJobOrderId, setDialogJobOrderId] = useState<number | null>(null);
  // The groups opened or folded away from how each starts: open, or folded
  // for a closed job order.
  const [toggledGroups, setToggledGroups] = useState<Set<string>>(new Set());
  // The tab open when expenses are shown in tabs; the first until one is
  // chosen.
  const [groupedTab, setGroupedTab] = useState<string | null>(null);

  const [expensePage, setExpensePage] = useState(1);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [expensesPagination, setExpensesPagination] = useState<{ total: number; totalPages: number; hasMore: boolean } | null>(null);

  const resetExpenseList = () => {
    setExpensePage(1);
    setExpensesList([]);
    setExpensesPagination(null);
  };

  useEffect(() => {
    resetExpenseList();
  }, [woSiteId]);

  const siteActivitiesQuery = trpc.workOrderSiteQuery.getSiteActivities.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );

  const bioremediationDataQuery = trpc.workOrderSiteQuery.getBioremediationData.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId && processType === "bioremediation" },
  );

  // Bioremediation expenses are spent on what the site's orders require.
  const orderItemsQuery = trpc.contractOrderQuery.getSiteContractOrderItems.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId && processType === "bioremediation" },
  );
  const orderItems = (orderItemsQuery.data ?? []) as SiteOrderItem[];

  // Restoration vendor expenses are spent on its job orders.
  const jobOrdersQuery = trpc.jobOrderQuery.getJobOrders.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId && processType === constants.WO_PROCESS.RESTORATION },
  );
  const jobOrders = (jobOrdersQuery.data ?? []) as JobOrder[];

  const expensesQuery = trpc.expenseQuery.getExpenses.useQuery(
    { work_order_site_id: woSiteId, page: expensePage },
    { enabled: !!woSiteId },
  );

  useEffect(() => {
    if (!expensesQuery.isLoading && expensesQuery.data?.expenses && expensesQuery.data.pagination?.page === expensePage) {
      const fetched = expensesQuery.data.expenses as Expense[];
      if (expensePage === 1) {
        setExpensesList(fetched);
      } else {
        setExpensesList(prev => [...prev, ...fetched]);
      }
      setExpensesPagination(expensesQuery.data.pagination);
    }
  }, [expensesQuery.dataUpdatedAt, expensePage]);

  const summaryQuery = trpc.expenseQuery.getExpenseSummary.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId },
  );

  const deleteExpenseMutation = trpc.expenseMutation.deleteExpense.useMutation();

  const expenses: Expense[] = expensesList;
  const summary = summaryQuery.data;
  const expenseTotal = summary?.grandTotal ?? 0;
  // Every expense, including those on pages not loaded yet.
  const entryCount = expensesPagination?.total ?? expensesList.length;
  const exceededTotal = summary?.exceededTotal ?? 0;

  const isBioremediation = processType === "bioremediation";
  const isRestoration = processType === constants.WO_PROCESS.RESTORATION;
  const estimateType = "estimate_sub-wo";

  const activityOptions: ActivityOption[] = useMemo(() => {
    // Bioremediation has one activity, and its expenses procure the oil
    // zapper planned with its estimate rather than a quantity of it.
    if (isBioremediation) {
      const planned = bioremediationDataQuery.data?.contaminatedSoil?.find(
        (i: any) => i.type === estimateType,
      )?.oil_zapper_quantity;
      return [
        {
          key: constants.OIL_ZAPPER.KEY,
          label: constants.OIL_ZAPPER.LABEL,
          unit: constants.OIL_ZAPPER.UNIT,
          estimateQty: planned != null ? Number(planned) : null,
        },
      ];
    }
    if (!siteActivitiesQuery.data) return [];
    // Restoration has no estimate: its schedule of rates is the limit.
    return siteActivitiesQuery.data.map((a: any) => ({
      key: a.activity,
      label: formatActivityLabel(a.activity),
      unit: a.unit ?? "Nos",
      estimateQty:
        a.sor_estimated_quantity != null ? Number(a.sor_estimated_quantity) : null,
    }));
  }, [siteActivitiesQuery.data, bioremediationDataQuery.data, isBioremediation]);

  // Only activities with an estimated quantity are tracked against it.
  const estimatedActivities = activityOptions.filter(
    (a): a is ActivityOption & { estimateQty: number } => a.estimateQty !== null,
  );

  const usedQtyByActivity = useMemo(() => {
    const byActivity = summaryQuery.data?.byActivity ?? {};
    return Object.fromEntries(
      Object.entries(byActivity).map(([k, v]) => [k, (v as { totalQuantity: number }).totalQuantity])
    );
  }, [summaryQuery.data?.byActivity]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDialogOrderId(
      orderItems.find((item) => item.id === expense.contract_order_item_id)
        ?.contract_order_id ?? null,
    );
    setDialogJobOrderId(expense.job_order_id ?? null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
    setAddUnder(null);
    setDialogOrderId(null);
    setDialogJobOrderId(null);
  };

  const openAddExpense = (
    under: number | "miscellaneous" | null = null,
    orderId: number | null = null,
    jobOrderId: number | null = null,
  ) => {
    setEditingExpense(null);
    setAddUnder(under);
    setDialogOrderId(orderId);
    setDialogJobOrderId(jobOrderId);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await deleteExpenseMutation.mutateAsync({ id: deletingId });
      resetExpenseList();
      await utils.expenseQuery.getExpenses.invalidate({ work_order_site_id: woSiteId });
      await utils.expenseQuery.getExpenseSummary.invalidate({ work_order_site_id: woSiteId });
      utils.expenseQuery.getVendorMonthlyExpenses.invalidate({ work_order_site_id: woSiteId });
      // Deleting one can reopen a completed restoration or bioremediation site.
      utils.restorationQuery.getRestoration.invalidate();
      utils.workOrderSiteQuery.getWorkOrderSiteDetails.invalidate({ work_order_site_id: woSiteId });
      utils.workOrderQuery.getWorkOrderDetails.invalidate();
      utils.workOrderSiteQuery.getOilZapperStock.invalidate({ work_order_site_id: woSiteId });
      // A single-expense requirement takes one again once its one is gone.
      utils.contractOrderQuery.getSiteContractOrderItems.invalidate({ work_order_site_id: woSiteId });
      toast.success("Expense deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  };

  // Newest first, narrowed to the chosen activity.
  const records = useMemo(() => {
    const activityMetaByKey: Record<string, { label: string; unit: string | null }> = {};
    for (const a of activityOptions) {
      activityMetaByKey[a.key] = { label: a.label, unit: a.unit ?? null };
    }
    const orderItemById = new Map(orderItems.map((item) => [item.id, item]));

    const all = expenses.map((exp): ExpenseRecord => {
      const activityKey = exp.activity_key ?? null;
      // A sub-contract expense is named, and measured, by its requirement.
      const orderItem = exp.contract_order_item_id
        ? orderItemById.get(exp.contract_order_item_id)
        : undefined;
      const activityMeta = activityKey
        ? (activityMetaByKey[activityKey] ?? { label: formatActivityLabel(activityKey), unit: null })
        : orderItem
          ? { label: itemLabel(orderItem.item, orderItem.description), unit: orderItem.unit }
          : { label: "Other / Unlinked Expenses", unit: null };
      return {
        id: exp.id,
        activityKey,
        activityLabel: activityMeta.label,
        unit: activityMeta.unit,
        startDate: exp.start_date,
        endDate: exp.end_date,
        quantity: exp.quantity ?? null,
        isExceeded: !!exp.is_exceeded,
        title: exp.title,
        contractorId: exp.contractor_id ?? null,
        contractorName: exp.contractor_name ?? null,
        contractOrderItemId: exp.contract_order_item_id ?? null,
        fromOrder: !!exp.from_order,
        jobOrderId: exp.job_order_id ?? null,
        invoiceNumber: exp.invoice_number ?? null,
        documents: toDocuments(exp.documents),
        amount: Number(exp.amount),
        recordedBy: exp.created_by_name ?? null,
        recordedAt: exp.created_at ?? null,
      };
    });
    all.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    if (activityFilter === "__all__") return all;
    const filterKey = activityFilter === "__none__" ? null : activityFilter;
    return all.filter((r) => r.activityKey === filterKey);
  }, [expenses, activityOptions, activityFilter, orderItems]);

  // An expense row. Its edit and delete are off when it is locked, such as on
  // a closed job order, saying why.
  const renderRecordRow = (
    record: ExpenseRecord,
    showVendor: boolean,
    showQty: boolean,
    lockedNote?: string,
  ) => {
    const { isExceeded } = record;
    const expense = expenses.find((e) => e.id === record.id);
    const documentCount = record.documents.length;
    const isOpen = expandedId === record.id;
    const toggle = () => setExpandedId(isOpen ? null : record.id);
    const columnCount = 6 + (showVendor ? 1 : 0) + (showQty ? 1 : 0);

    return (
      <React.Fragment key={record.id}>
        <TableRow
          onClick={toggle}
          className={cn(
            "cursor-pointer border-gray-100",
            isOpen && "border-transparent",
            isExceeded ? "bg-orange-50/40 hover:bg-orange-50/70" : "hover:bg-gray-50/80",
            isOpen && !isExceeded && "bg-gray-50/80",
          )}>
          <TableCell
            className={cn(
              cellClass,
              "whitespace-nowrap text-xs tabular-nums text-gray-600",
            )}>
            <button
              type='button'
              aria-expanded={isOpen}
              aria-label={isOpen ? "Hide expense details" : "Show expense details"}
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              className='inline-flex items-center gap-1.5 rounded text-left'>
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0 text-gray-400 transition-transform",
                  isOpen && "rotate-90",
                )}
              />
              {formatDateRange(record.startDate, record.endDate)}
            </button>
          </TableCell>
          {/* What was spent on, and against which activity. */}
          <TableCell className={cn(cellClass, "min-w-48")}>
            <p className='text-[13px] font-medium text-gray-900'>{record.title}</p>
            <p className='mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500'>
              <span>{record.activityLabel}</span>
              {isExceeded && (
                <span className='inline-flex items-center gap-1 font-medium text-orange-600'>
                  <AlertTriangle className='size-3' />
                  Exceeded
                </span>
              )}
            </p>
          </TableCell>
          {showQty && (
            <TableCell className={cn(cellClass, "whitespace-nowrap text-right text-xs tabular-nums")}>
              {record.quantity ? (
                <>
                  <span className='font-medium text-gray-800'>
                    {formatQty(Number(record.quantity))}
                  </span>
                  {record.unit && <span className='ml-1 text-gray-400'>{record.unit}</span>}
                </>
              ) : (
                <span className='text-gray-300'>—</span>
              )}
            </TableCell>
          )}
          {showVendor && (
            <TableCell className={cn(cellClass, "text-xs text-gray-600")}>
              {record.contractorName ?? <span className='text-gray-300'>—</span>}
            </TableCell>
          )}
          <TableCell className={cn(cellClass, "text-xs text-gray-600")}>
            {record.invoiceNumber ?? <span className='text-gray-300'>—</span>}
          </TableCell>
          <TableCell className={cn(cellClass, "whitespace-nowrap text-xs")}>
            {documentCount > 0 ? (
              <DocumentsMenu documents={record.documents}>
                <button
                  type='button'
                  title={documentCount === 1 ? "Open the document" : "Choose a document to open"}
                  className='inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-blue-600 transition-colors hover:bg-blue-50'>
                  <Paperclip className='size-3.5' />
                  {documentCount === 1 ? "1 file" : `${documentCount} files`}
                </button>
              </DocumentsMenu>
            ) : (
              <span className='text-gray-300'>—</span>
            )}
          </TableCell>
          <TableCell className={cn(cellClass, "whitespace-nowrap text-right")}>
            <span
              className={cn(
                "text-[13px] font-semibold tabular-nums",
                isExceeded ? "text-orange-700" : "text-gray-900",
              )}>
              {formatCurrency(record.amount)}
            </span>
          </TableCell>
          <TableCell className={cn(cellClass, actionsColumnClass, "whitespace-nowrap")}>
            <div
              className='flex items-center justify-end gap-0.5'
              title={
                record.fromOrder
                  ? "Recorded by its purchase order. Edit the order to change it."
                  : lockedNote
              }>
              <button
                type='button'
                aria-label='Edit expense'
                title={record.fromOrder || lockedNote ? undefined : "Edit"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (expense) handleEdit(expense);
                }}
                disabled={isViewer || !expense || record.fromOrder || !!lockedNote}
                className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30'>
                <Pencil className='size-3.5' />
              </button>
              <button
                type='button'
                aria-label='Delete expense'
                title={record.fromOrder || lockedNote ? undefined : "Delete"}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingId(record.id);
                }}
                disabled={isViewer || record.fromOrder || !!lockedNote}
                className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30'>
                <Trash2 className='size-3.5' />
              </button>
            </div>
          </TableCell>
        </TableRow>
        {isOpen && (
          <TableRow
            className={cn(
              "border-gray-100 hover:bg-transparent",
              isExceeded ? "bg-orange-50/40" : "bg-gray-50/80",
            )}>
            <TableCell
              colSpan={columnCount}
              className='px-3 pb-4 pt-1 sm:px-3 sm:pb-4 sm:pt-1'>
              <dl className='grid grid-cols-2 gap-x-6 gap-y-3 pl-5 sm:grid-cols-4'>
                <Detail label='Title' className='col-span-2 sm:col-span-4'>
                  <span className='whitespace-pre-wrap break-words'>{record.title}</span>
                </Detail>
                <Detail label='Under'>{record.contractorName ?? "Miscellaneous"}</Detail>
                <Detail label='Activity'>{record.activityLabel}</Detail>
                <Detail label='Dates' className='col-span-2'>
                  {formatFullDates(record.startDate, record.endDate)}
                </Detail>
                <Detail label='Quantity'>
                  {record.quantity
                    ? `${formatQty(Number(record.quantity))}${record.unit ? ` ${record.unit}` : ""}`
                    : "Not recorded"}
                </Detail>
                <Detail label='Amount'>
                  <span className='font-semibold tabular-nums'>{formatCurrency(record.amount)}</span>
                </Detail>
                <Detail label='Invoice #'>{record.invoiceNumber ?? "None"}</Detail>
                {(record.quantity || isExceeded) && (
                  <Detail label='Estimate'>
                    {isExceeded ? (
                      <span className='font-medium text-orange-700'>
                        Exceeded the activity&apos;s quantity
                      </span>
                    ) : (
                      "Within the activity's quantity"
                    )}
                  </Detail>
                )}
                <Detail label='Recorded' className='col-span-2'>
                  {record.recordedBy ?? "Unknown user"}
                  {record.recordedAt &&
                    ` on ${format(new Date(record.recordedAt), "d MMM yyyy, h:mm a")}`}
                </Detail>
                <Detail label='Documents' className='col-span-2 sm:col-span-4'>
                  {documentCount === 0 ? (
                    "None attached"
                  ) : (
                    <ul className='mt-0.5 flex flex-wrap gap-1.5'>
                      {record.documents.map((doc, index) => (
                        <li key={`${doc.url}-${index}`}>
                          <button
                            type='button'
                            onClick={() => openDocument(doc)}
                            className='inline-flex max-w-64 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 transition-colors hover:border-blue-200 hover:text-blue-700'>
                            <FileText className='size-3.5 shrink-0 text-gray-400' />
                            <span className='truncate'>{documentName(doc, index)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Detail>
              </dl>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  // Quantity only shows once one of the rows records one.
  const renderRecordsTable = (
    rows: ExpenseRecord[],
    showVendor = true,
    lockedNote?: string,
  ) => {
    const showQty = rows.some((r) => r.quantity);
    return (
      <Table>
        <TableHeader>
          <TableRow className='border-gray-100 hover:bg-transparent'>
            <TableHead className={cn(headClass, "w-[160px]")}>
              {/* In line with the dates, past each row's arrow. */}
              <span className='pl-5'>Dates</span>
            </TableHead>
            <TableHead className={headClass}>Expense</TableHead>
            {showQty && (
              <TableHead className={cn(headClass, "w-[90px] text-right")}>Qty</TableHead>
            )}
            {showVendor && <TableHead className={headClass}>Vendor</TableHead>}
            <TableHead className={cn(headClass, "w-[130px]")}>Invoice</TableHead>
            <TableHead className={cn(headClass, "w-[100px]")}>Documents</TableHead>
            <TableHead className={cn(headClass, "w-[120px] text-right")}>Amount</TableHead>
            <TableHead className={cn(headClass, actionsColumnClass)}>
              <span className='sr-only'>Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => renderRecordRow(r, showVendor, showQty, lockedNote))}
        </TableBody>
      </Table>
    );
  };

  // A records table on its own, such as the miscellaneous expenses.
  const renderRecordsBox = (rows: ExpenseRecord[], showVendor = true) => (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
      {renderRecordsTable(rows, showVendor)}
    </div>
  );

  // Bioremediation totals per order requirement, and per vendor under it.
  const orderItemTotal = (itemId: number): number =>
    summary?.byOrderItem?.[String(itemId)] ?? 0;
  const orderItemVendorTotal = (itemId: number, vendorId: number): number =>
    summary?.byOrderItemVendor?.[`${itemId}:${vendorId}`] ?? 0;

  const toggleGroup = (key: string) =>
    setToggledGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A total, kept quiet while nothing is spent.
  const renderTotal = (total: number, className?: string) => (
    <span
      className={cn(
        "shrink-0 text-right tabular-nums",
        total > 0 ? "font-semibold text-gray-900" : "text-gray-400",
        className,
      )}>
      {formatCurrency(total)}
    </span>
  );

  // Heads a list of groups, or the miscellaneous expenses, with its total.
  const renderSectionHeader = ({
    Icon,
    title,
    meta,
    total,
    action,
  }: {
    Icon: React.ElementType;
    title: string;
    meta: string;
    total: number;
    action?: React.ReactNode;
  }) => (
    <div className='flex min-h-7 items-center gap-2 pr-[13px]'>
      <Icon className='size-3.5 shrink-0 text-gray-400' />
      <h4 className='text-xs font-semibold text-gray-700'>{title}</h4>
      <span className='text-[11px] text-gray-400'>{meta}</span>
      <div className='ml-auto flex items-center gap-3'>
        {action}
        {renderTotal(total, "text-sm")}
        <span className={menuSlotClass} />
      </div>
    </div>
  );

  const renderAddExpenseButton = (label: string, onClick: () => void) => (
    <button
      type='button'
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={isViewer}
      className='inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-40'>
      <Plus className='size-3.5 text-gray-500' />
      Add expense
    </button>
  );

  // Expenses spent on something with its own vendors, such as a job order or
  // a contract order: a card for each, listing its expenses.
  type ExpenseGroup = {
    key: string;
    // Its number, such as the job order's.
    badge: string;
    // Shown in place of the number, such as a job order's chip with its
    // details on hover.
    badgeNode?: React.ReactNode;
    title: string;
    meta?: string;
    total: number;
    // What it gives out, such as a sub-contract's items, each with its terms
    // and what it has cost.
    requirements?: {
      key: string;
      label: string;
      terms: string;
      total: number;
    }[];
    vendors: { id: number; name: string }[];
    records: ExpenseRecord[];
    vendorTotal: (vendorId: number) => number;
    // Adds an expense on it, under the vendor chosen in the dialog. Left out
    // where expenses aren't added at the site, as on a purchase order.
    onAdd?: () => void;
    // Where it stands, such as a job order's certificates.
    status?: React.ReactNode;
    menu?: React.ReactNode;
    // Why its expenses are locked, such as a job order closed by its
    // certificate. It then takes no more and starts folded.
    closedNote?: string;
  };

  // An order's requirements at the site, as one card listing every expense
  // on any of them. A purchase order records its own cost. A sub-contract's
  // expenses are added here, each for one of its items; a single-expense
  // one's only until each item has its one, which holds the total quantity.
  const toOrderGroup = (items: SiteOrderItem[]): ExpenseGroup => {
    const first = items[0]!;
    const itemIds = new Set(items.map((item) => item.id));
    const sumOver = (total: (itemId: number) => number) =>
      items.reduce((sum, item) => sum + total(item.id), 0);
    const group = {
      key: `order-${first.contract_order_id}`,
      badge: first.order_code,
      title: items
        .map((item) => itemLabel(item.item, item.description))
        .join(", "),
      total: sumOver(orderItemTotal),
      vendors: first.vendors,
      records: records.filter(
        (r) =>
          r.contractOrderItemId !== null && itemIds.has(r.contractOrderItemId),
      ),
      vendorTotal: (vendorId: number) =>
        sumOver((itemId) => orderItemVendorTotal(itemId, vendorId)),
    };

    if (first.order_type === constants.CONTRACT_ORDER_TYPE.PURCHASE_ORDER) {
      return {
        ...group,
        meta: items.map(orderItemTerms).join(", "),
        status: (
          <span className='shrink-0 whitespace-nowrap rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200'>
            Costed by the order
          </span>
        ),
      };
    }

    const isAllRecorded =
      first.single_expense && items.every((item) => item.expense_count > 0);
    return {
      ...group,
      requirements: items.map((item) => ({
        key: String(item.id),
        label: itemLabel(item.item, item.description),
        terms: orderItemTerms(item),
        total: orderItemTotal(item.id),
      })),
      status: first.single_expense && (
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
            isAllRecorded
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-gray-50 text-gray-600 ring-gray-200",
          )}>
          {isAllRecorded ? "All recorded" : "One expense per item"}
        </span>
      ),
      onAdd: isAllRecorded
        ? undefined
        : () => openAddExpense(null, first.contract_order_id),
    };
  };

  // In the colour of the process, as on the work order page.
  const badgeTone = isBioremediation
    ? "bg-blue-50 text-blue-700 ring-blue-200"
    : "bg-purple-50 text-purple-700 ring-purple-200";

  // Who a group's work is given to, each with what they have cost on it.
  const renderVendorStrip = (group: ExpenseGroup) => (
    <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-gray-100 bg-gray-50/70 px-3 py-2'>
      <span className='inline-flex items-center gap-1.5 pl-6 pr-1 text-[11px] font-medium text-gray-500'>
        <HardHat className='size-3.5 text-gray-400' />
        Vendors
      </span>
      {group.vendors.length === 0 ? (
        <span className='text-xs text-gray-400'>None on this yet</span>
      ) : (
        group.vendors.map((vendor) => {
          const total = group.vendorTotal(vendor.id);
          return (
            <span
              key={vendor.id}
              className='inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs ring-1 ring-inset ring-gray-200'>
              <span className='font-medium text-gray-700'>
                {capitalFirstLetter(vendor.name)}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  total > 0 ? "text-gray-900" : "text-gray-400",
                )}>
                {total > 0 ? formatCurrency(total) : "No expenses"}
              </span>
            </span>
          );
        })
      )}
    </div>
  );

  // What a group gives out, each with its terms and what it has cost on it.
  const renderRequirementStrip = (
    requirements: NonNullable<ExpenseGroup["requirements"]>,
  ) => (
    <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-gray-100 bg-gray-50/70 px-3 py-2'>
      <span className='inline-flex items-center gap-1.5 pl-6 pr-1 text-[11px] font-medium text-gray-500'>
        <Package className='size-3.5 text-gray-400' />
        Items
      </span>
      {requirements.map((requirement) => (
        <span
          key={requirement.key}
          className='inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs ring-1 ring-inset ring-gray-200'>
          <span className='font-medium text-gray-700'>{requirement.label}</span>
          <span className='text-gray-400'>{requirement.terms}</span>
          <span
            className={cn(
              "tabular-nums",
              requirement.total > 0 ? "text-gray-900" : "text-gray-400",
            )}>
            {requirement.total > 0
              ? formatCurrency(requirement.total)
              : "No expenses"}
          </span>
        </span>
      ))}
    </div>
  );

  // A job order or contract order, as a card: what it gives out and its
  // vendors, then its expenses.
  const renderGroupCard = (group: ExpenseGroup) => {
    const isOpen = toggledGroups.has(group.key) === !!group.closedNote;

    return (
      <div
        key={group.key}
        className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
        <div className='flex items-center gap-3 px-3 py-2.5'>
          <div className='flex min-w-0 flex-1 items-center gap-2'>
            <button
              type='button'
              onClick={() => toggleGroup(group.key)}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Hide" : "Show"} ${group.badge}'s expenses`}
              className='-m-0.5 shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600'>
              <ChevronRight
                className={cn("size-4 transition-transform", isOpen && "rotate-90")}
              />
            </button>
            {/* Its own control, so it isn't inside the toggle. */}
            {group.badgeNode}
            {/* The rest opens and closes it too, for the mouse; the arrow is
                the keyboard's way. */}
            <div
              onClick={() => toggleGroup(group.key)}
              className='flex min-w-0 flex-1 cursor-pointer select-none items-center gap-2'>
              {!group.badgeNode && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                    badgeTone,
                  )}>
                  {group.badge}
                </span>
              )}
              <span className='truncate text-sm font-medium text-gray-900'>
                {group.title}
              </span>
              {group.meta && (
                <span className='hidden shrink-0 text-xs text-gray-400 md:inline'>
                  {group.meta}
                </span>
              )}
            </div>
          </div>
          {group.status}
          {group.closedNote ? (
            <span
              title={group.closedNote}
              className='inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-gray-100 px-2 text-xs font-medium text-gray-600'>
              <Lock className='size-3.5' />
              Closed
            </span>
          ) : (
            group.onAdd &&
            renderAddExpenseButton(`Add an expense on ${group.badge}`, group.onAdd)
          )}
          {renderTotal(group.total, "min-w-24 text-sm")}
          <div className={menuSlotClass}>{group.menu}</div>
        </div>
        {isOpen && (
          <>
            {group.requirements && renderRequirementStrip(group.requirements)}
            {renderVendorStrip(group)}
            {group.records.length > 0 ? (
              <div className='border-t border-gray-100'>
                {renderRecordsTable(group.records, true, group.closedNote)}
              </div>
            ) : (
              <p className='border-t border-gray-100 py-2.5 pl-9 pr-3 text-xs text-gray-400'>
                No expenses on this yet.
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  // The grouped sections, then vendor expenses in no group (recorded before
  // the groups were kept), then the miscellaneous ones under no vendor. As
  // tabs, each section and the miscellaneous expenses are a tab of their own;
  // the vendor expenses in no group join the first, or get a tab of their own
  // when it is named and they have any.
  const renderGroupedExpenses = ({
    sections,
    unassignedTitle,
    asTabs = false,
    unassignedTab,
  }: {
    sections: {
      key: string;
      Icon: React.ElementType;
      title: string;
      meta: string;
      emptyText: string;
      action?: React.ReactNode;
      groups: ExpenseGroup[];
    }[];
    unassignedTitle: string;
    asTabs?: boolean;
    unassignedTab?: string;
  }) => {
    const groupedIds = new Set(
      sections.flatMap((section) =>
        section.groups.flatMap((group) => group.records.map((r) => r.id)),
      ),
    );
    const unassignedRecords = records.filter(
      (r) => r.contractorId !== null && !groupedIds.has(r.id),
    );
    const miscellaneousRecords = records.filter(
      (r) => r.contractorId === null && !groupedIds.has(r.id),
    );
    const groupedTotal = sections.reduce(
      (sum, section) =>
        sum + section.groups.reduce((groupSum, group) => groupSum + group.total, 0),
      0,
    );
    const miscellaneousTotal = summary?.byContractor?.none ?? 0;

    const sectionNodes = sections.map((section) => (
      <section
        key={section.key}
        className='space-y-2'>
        {renderSectionHeader({
          Icon: section.Icon,
          title: section.title,
          meta: section.meta,
          total: section.groups.reduce((sum, group) => sum + group.total, 0),
          action: section.action,
        })}
        {section.groups.length === 0
          ? emptyGroupText(section.emptyText)
          : section.groups.map((group) => renderGroupCard(group))}
      </section>
    ));

    const unassignedNode = unassignedRecords.length > 0 && (
      <section className='space-y-2'>
        {renderSectionHeader({
          Icon: HardHat,
          title: unassignedTitle,
          meta: `${unassignedRecords.length} expense${unassignedRecords.length !== 1 ? "s" : ""}`,
          total: expenseTotal - miscellaneousTotal - groupedTotal,
        })}
        {renderRecordsBox(unassignedRecords)}
      </section>
    );

    const miscellaneousNode = (
      <section className='space-y-2'>
        {renderSectionHeader({
          Icon: ReceiptIndianRupee,
          title: "Miscellaneous",
          meta:
            miscellaneousRecords.length === 0
              ? "None yet"
              : `${miscellaneousRecords.length} expense${miscellaneousRecords.length !== 1 ? "s" : ""}`,
          total: miscellaneousTotal,
          action: renderAddExpenseButton("Add a miscellaneous expense", () =>
            openAddExpense("miscellaneous"),
          ),
        })}
        {miscellaneousRecords.length > 0 &&
          renderRecordsBox(miscellaneousRecords)}
      </section>
    );

    const pageNote = expensesPagination &&
      expensesPagination.total > expenses.length && (
        <p className='text-xs text-gray-400'>
          Showing {expenses.length} of {expensesPagination.total} entries
        </p>
      );

    if (asTabs) {
      const tabs = [
        ...sections.map((section, index) => ({
          key: section.key,
          Icon: section.Icon,
          label: section.title,
          count: section.groups.length,
          content: (
            <div className='space-y-6'>
              {sectionNodes[index]}
              {index === 0 && !unassignedTab && unassignedNode}
            </div>
          ),
        })),
        ...(unassignedTab && unassignedRecords.length > 0
          ? [
              {
                key: UNASSIGNED_TAB,
                Icon: HardHat,
                label: unassignedTab,
                count: unassignedRecords.length,
                content: unassignedNode,
              },
            ]
          : []),
        {
          key: MISCELLANEOUS_TAB,
          Icon: ReceiptIndianRupee,
          label: "Miscellaneous",
          count: miscellaneousRecords.length,
          content: miscellaneousNode,
        },
      ];
      const active = tabs.find((tab) => tab.key === groupedTab) ?? tabs[0]!;

      return (
        <div className='space-y-4'>
          <Tabs
            value={active.key}
            onValueChange={setGroupedTab}>
            <TabsList className='h-8'>
              {tabs.map(({ key, Icon, label, count }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className='gap-1.5 px-2.5 text-xs text-gray-800'>
                  <Icon className='size-3.5 text-gray-500' />
                  {label}
                  <span className='tabular-nums text-gray-400'>{count}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {active.content}
          {pageNote}
        </div>
      );
    }

    return (
      <div className='space-y-6'>
        {sectionNodes}
        {unassignedNode}
        {miscellaneousNode}
        {pageNote}
      </div>
    );
  };

  // The dialog's order, by its requirements at the site; the first carries
  // the order's code and vendors.
  const dialogOrderItems = orderItems.filter(
    (item) => item.contract_order_id === dialogOrderId,
  );
  const dialogOrder = dialogOrderItems[0] ?? null;
  const dialogJobOrder =
    jobOrders.find((jobOrder) => jobOrder.id === dialogJobOrderId) ?? null;
  const editingVendor =
    editingExpense?.contractor_id && editingExpense.contractor_name
      ? [{ id: editingExpense.contractor_id, name: editingExpense.contractor_name }]
      : [];
  // Which vendors the expense dialog offers. A bioremediation expense on an
  // order is under one of the order's vendors; an older one keeps its own;
  // a miscellaneous one has none.
  const dialogContractors = isBioremediation
    ? dialogOrder
      ? dialogOrder.vendors
      : editingVendor
    : isRestoration
      ? dialogJobOrder
        ? dialogJobOrder.vendors
        : editingVendor
      : undefined;
  // Oil zapper is procured through a purchase of it; an older vendor expense
  // may also carry some.
  const dialogProcuresOilZapper =
    isBioremediation &&
    (dialogOrder
      ? dialogOrderItems.some((item) => item.item === constants.OIL_ZAPPER.KEY)
      : editingExpense?.activity_key === constants.OIL_ZAPPER.KEY);
  // A job order's expenses are under the activities it gives out. An expense
  // being edited keeps its own activity, so it still shows.
  const dialogJobOrderActivities = dialogJobOrder
    ? jobOrderSorActivities(dialogJobOrder)
    : null;
  const dialogActivities =
    dialogProcuresOilZapper || !isBioremediation
      ? activityOptions.filter(
          (activity) =>
            !dialogJobOrderActivities ||
            dialogJobOrderActivities.has(activity.key) ||
            activity.key === editingExpense?.activity_key,
        )
      : [];
  const dialogActivitiesNote =
    dialogJobOrder && dialogJobOrderActivities
      ? dialogActivities.length > 0
        ? `Only the activities job order ${dialogJobOrder.jo_number} gives out.`
        : `Job order ${dialogJobOrder.jo_number} gives out none of the schedule of rates activities. Edit the job order to add them.`
      : undefined;

  const emptyGroupText = (text: string) => (
    <p className='rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-400'>
      {text}
    </p>
  );

  return (
    <div className='space-y-4'>
      {/* Hidden until the estimate gives an activity a quantity. */}
      {showEstimateTable && !isBioremediation && estimatedActivities.length > 0 && (
        <div className='rounded-lg border border-slate-200 bg-slate-50/40 overflow-hidden'>
          <div className='px-3 py-2 border-b bg-white flex items-center justify-between gap-3'>
            <div className='min-w-0'>
              <p className='text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap'>
                Estimate Activities
              </p>
              <p className='text-[9px] text-slate-400 mt-0.5'>
                Qty spending = used qty from expense records
              </p>
            </div>
            <div className='text-[9px] text-slate-400 whitespace-nowrap'>
              {estimatedActivities.length} {estimatedActivities.length === 1 ? "activity" : "activities"}
            </div>
          </div>

          <div className='bg-white overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-gray-50/60 hover:bg-gray-50/60'>
                  <TableHead className='text-[10px] font-semibold text-gray-600 whitespace-nowrap'>
                    Activity
                  </TableHead>
                  <TableHead className='text-[10px] font-semibold text-gray-600 text-right whitespace-nowrap w-[90px]'>
                    Est
                  </TableHead>
                  <TableHead className='text-[10px] font-semibold text-gray-600 text-right whitespace-nowrap w-[90px]'>
                    Used
                  </TableHead>
                  <TableHead className='text-[10px] font-semibold text-gray-600 text-right whitespace-nowrap w-[90px]'>
                    Left
                  </TableHead>
                  <TableHead className='text-[10px] font-semibold text-gray-600 whitespace-nowrap w-[70px]'>
                    Unit
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimatedActivities.map((a) => {
                  const estQty = a.estimateQty;
                  const usedQty = usedQtyByActivity[a.key] ?? 0;
                  const left = Math.max(0, estQty - usedQty);
                  const exhausted = estQty > 0 && left <= 0;
                  return (
                    <TableRow
                      key={a.key}
                      className={exhausted ? "bg-orange-50/30 hover:bg-orange-50/40" : "hover:bg-blue-50/20"}>
                      <TableCell className='py-2 text-xs text-gray-700 font-medium whitespace-nowrap'>
                        {a.label}
                      </TableCell>
                      <TableCell className='py-2 text-xs text-gray-600 text-right tabular-nums whitespace-nowrap'>
                        {estQty}
                      </TableCell>
                      <TableCell className='py-2 text-xs text-gray-600 text-right tabular-nums whitespace-nowrap'>
                        {usedQty}
                      </TableCell>
                      <TableCell className='py-2 text-xs text-right tabular-nums whitespace-nowrap'>
                        {exhausted ? (
                          <span className='text-orange-700 font-semibold'>0</span>
                        ) : (
                          <span className='text-emerald-700 font-semibold'>{left}</span>
                        )}
                      </TableCell>
                      <TableCell className='py-2 text-xs text-gray-500 whitespace-nowrap'>
                        {a.unit ?? "Nos"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-sm font-semibold text-gray-900'>Expenses</h3>
            {exceededTotal > 0 && (
              <span className='inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200'>
                <AlertTriangle className='size-3' />
                {formatCurrency(exceededTotal)} exceeded
              </span>
            )}
          </div>
          <p className='mt-0.5 text-xs text-gray-500'>
            <span className='font-semibold tabular-nums text-gray-900'>
              {formatCurrency(expenseTotal)}
            </span>{" "}
            spent across {entryCount} expense{entryCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {/* Bioremediation's one activity leaves nothing to filter by. */}
          {!isBioremediation && (
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger className='h-8 w-full text-xs sm:w-48'>
                <SelectValue placeholder='Filter by activity' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__all__' className='text-sm'>All activities</SelectItem>
                <SelectItem value='__none__' className='text-sm'>Other / Unlinked</SelectItem>
                {activityOptions.map((a) => (
                  <SelectItem key={a.key} value={a.key} className='text-sm'>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <CustomButton
            text='Monthly expenses'
            variant='outline'
            Icon={CalendarRange}
            onClick={() => setMonthlyOpen(true)}
            className='h-8 text-xs'
          />
          {headerActions}
          {/* Bioremediation and restoration expenses are added under an
              order or job order, or as miscellaneous, from their groups. */}
          {!isBioremediation && !isRestoration && (
            <CustomButton
              text='Add Expense'
              variant='primary'
              Icon={Plus}
              onClick={() => openAddExpense()}
              className='h-8 text-xs'
              disableForViewer
            />
          )}
        </div>
      </div>

      {expensesQuery.isLoading && expensePage === 1 ? (
        <ExpenseGroupsSkeleton />
      ) : isBioremediation ? (
        renderGroupedExpenses({
          // A card per order, however many of its items are at the site.
          sections: ORDER_GROUPS.map(({ type, title, noun, Icon }) => {
            const orders = itemsByOrder(orderItems, type);
            return {
              key: type,
              Icon,
              title,
              meta: `${orders.length} ${noun}${orders.length !== 1 ? "s" : ""}`,
              emptyText: "No orders require anything at this site yet.",
              groups: orders.map(toOrderGroup),
            };
          }),
          unassignedTitle: "Vendor expenses not on an order",
          asTabs: true,
          unassignedTab: "Not on an order",
        })
      ) : isRestoration ? (
        renderGroupedExpenses({
          sections: [
            {
              key: "job-orders",
              Icon: ClipboardList,
              title: "Job orders",
              meta: `${jobOrders.length} job order${jobOrders.length !== 1 ? "s" : ""}`,
              emptyText: "No job orders yet. Add one to record vendor expenses on it.",
              groups: jobOrders.map((jobOrder) => ({
                key: `job-order-${jobOrder.id}`,
                badge: jobOrder.jo_number,
                badgeNode: <JobOrderChip jobOrder={jobOrder} />,
                title: jobOrderPlace(jobOrder),
                meta: formatDateRange(jobOrder.start_date, jobOrder.end_date),
                total: summary?.byJobOrder?.[String(jobOrder.id)] ?? 0,
                vendors: jobOrder.vendors,
                records: records.filter((r) => r.jobOrderId === jobOrder.id),
                vendorTotal: (vendorId: number) =>
                  summary?.byJobOrderVendor?.[`${jobOrder.id}:${vendorId}`] ?? 0,
                onAdd: () => openAddExpense(null, null, jobOrder.id),
                closedNote: isJobOrderClosed(jobOrder)
                  ? `Closed, as ${jobOrder.jo_number}'s completion certificate is uploaded. Remove the certificate to reopen it.`
                  : undefined,
                status: jobOrderStatus?.(jobOrder),
                menu: jobOrderActions?.(jobOrder),
              })),
            },
          ],
          unassignedTitle: "Vendor expenses not on a job order",
          asTabs: true,
        })
      ) : records.length === 0 ? (
        <div className='text-center py-10 border border-dashed rounded-xl bg-gray-50/30'>
          <ReceiptIndianRupee className='w-8 h-8 text-gray-300 mx-auto mb-2' />
          <p className='text-sm text-gray-500 font-medium'>No expenses yet</p>
          <p className='text-xs text-gray-400 mt-1'>
            Click &quot;Add Expense&quot; to record the first expense for this site.
          </p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-lg border border-gray-200 bg-white'>
          {renderRecordsTable(records)}

          <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t text-xs'>
            <span className='text-gray-500'>
              {records.length} record{records.length !== 1 ? "s" : ""}
              {expensesPagination && expensesPagination.total > expenses.length && (
                <span className='text-gray-400 ml-1'>
                  (showing {expenses.length} of {expensesPagination.total} entries)
                </span>
              )}
              {exceededTotal > 0 && (
                <span className='text-orange-600 ml-2'>
                  · {formatCurrency(exceededTotal)} exceeded
                </span>
              )}
            </span>
            <span className='font-semibold text-red-700'>
              Total: {formatCurrency(expenseTotal)}
            </span>
          </div>
        </div>
      )}

      {expensesPagination?.hasMore && (
        <LoadMoreBtn
          onClick={() => setExpensePage(prev => prev + 1)}
          loading={expensesQuery.isLoading && expensePage > 1}
        />
      )}

      <AddExpenseDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSuccess={resetExpenseList}
        workOrderSiteId={woSiteId}
        editingExpense={editingExpense}
        usedQtyByActivity={usedQtyByActivity}
        contractors={dialogContractors}
        defaultContractorId={typeof addUnder === "number" ? addUnder : null}
        startsMiscellaneous={addUnder === "miscellaneous"}
        fixedActivityKey={dialogProcuresOilZapper ? constants.OIL_ZAPPER.KEY : undefined}
        activities={dialogActivities}
        activitiesNote={dialogActivitiesNote}
        order={
          dialogOrder
            ? {
                label: dialogOrder.order_code,
                items: dialogOrderItems.map((item) =>
                  toItemOption(item, editingExpense),
                ),
              }
            : null
        }
        jobOrder={
          dialogJobOrder
            ? {
                id: dialogJobOrder.id,
                label: [
                  dialogJobOrder.jo_number,
                  jobOrderPlace(dialogJobOrder),
                ]
                  .filter(Boolean)
                  .join(" · "),
              }
            : null
        }
      />

      <VendorMonthlyExpensesDialog
        woSiteId={woSiteId}
        isRestoration={isRestoration}
        open={monthlyOpen}
        onOpenChange={setMonthlyOpen}
      />

      <AlertDialog
        open={deletingId !== null}
        onOpenChange={(v) => !v && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this expense. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-red-600 hover:bg-red-700 text-white'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SiteExpensesSection;

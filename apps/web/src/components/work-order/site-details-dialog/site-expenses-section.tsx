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
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  HardHat,
  Paperclip,
  ReceiptIndianRupee,
  AlertTriangle,
  ChevronRight,
  CornerDownRight,
} from "lucide-react";
import toast from "react-hot-toast";
import CustomButton from "@/components/shared/btn";
import { cn } from "@/lib/utils";
import { useIsViewer } from "@/contexts/AuthContext";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import AddExpenseDialog, {
  ActivityOption,
  Expense,
} from "./add-expense-dialog";
import DocumentsMenu from "@/components/shared/documents-menu";
import { toDocuments, type StoredDocument } from "@/lib/documents";
import { formatDateRange } from "@/lib/wo-site-display";

type ExpenseRecord = {
  id: number;
  activityKey: string | null;
  activityLabel: string;
  unit: string | null;
  startDate: string | Date;
  endDate: string | Date;
  quantity: string | null;
  isExceeded: boolean;
  description: string;
  contractorId: number | null;
  contractorName: string | null;
  invoiceNumber: string | null;
  documents: StoredDocument[];
  amount: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatQty = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);

// Tighter than the table defaults, so a record takes one compact row.
const headClass =
  "h-9 px-3 sm:h-9 sm:px-3 text-xs font-medium text-gray-500 whitespace-nowrap";
const cellClass = "px-3 py-2.5 sm:px-3 sm:py-2.5";

const formatActivityLabel = (key: string) =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

interface Props {
  woSiteId: number;
  processType?: string;
  // Lists the expenses under each vendor apart from the rest.
  splitByContractor?: boolean;
  contractors?: { id: number; name: string }[];
  // Off when the caller already shows estimated, used and left quantities.
  showEstimateTable?: boolean;
  // Off to drop the income, expenses and net P&L cards.
  showSummaryCards?: boolean;
  // Extra buttons beside Add Expense.
  headerActions?: React.ReactNode;
  // Shown on a vendor with no expenses, such as a button to remove it.
  emptyVendorActions?: (vendor: { id: number; name: string }) => React.ReactNode;
}

const SiteExpensesSection = ({
  woSiteId,
  processType,
  splitByContractor = false,
  contractors = [],
  showEstimateTable = true,
  showSummaryCards = true,
  headerActions,
  emptyVendorActions,
}: Props) => {
  const utils = trpc.useUtils();
  const isViewer = useIsViewer();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>("__all__");
  // The vendor a new expense starts under, when added from its group.
  const [addUnderId, setAddUnderId] = useState<number | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

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
  const incomeTotal = summary?.incomeTotal ?? 0;
  const expenseTotal = summary?.grandTotal ?? 0;
  const exceededTotal = summary?.exceededTotal ?? 0;
  const regularTotal = summary?.regularTotal ?? expenseTotal - exceededTotal;
  const netPL = incomeTotal - expenseTotal;

  const isBioremediation = processType === "bioremediation";
  const estimateType = "estimate_sub-wo";

  const getEstimateQty = (activityKey: string): number | null => {
    if (isBioremediation) {
      const data = bioremediationDataQuery.data;
      if (!data) return null;
      if (
        activityKey === "biorem_cont_soil" ||
        activityKey === constants.WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL
      ) {
        const qty = data.contaminatedSoil?.find((i: any) => i.type === estimateType)?.estimated_quantity;
        return qty != null ? Number(qty) : null;
      }
      return null;
    }
    // Restoration has no estimate: its schedule of rates is the limit.
    const sorQty = siteActivitiesQuery.data?.find(
      (a: any) => a.activity === activityKey,
    )?.sor_estimated_quantity;
    return sorQty != null ? Number(sorQty) : null;
  };

  const activityOptions: ActivityOption[] = useMemo(() => {
    if (!siteActivitiesQuery.data) return [];
    return siteActivitiesQuery.data.map((a: any) => ({
      key: a.activity,
      label: formatActivityLabel(a.activity),
      unit: a.unit ?? "Nos",
      estimateQty: getEstimateQty(a.activity),
    }));
  }, [siteActivitiesQuery.data, bioremediationDataQuery.data]);

  const usedQtyByActivity = useMemo(() => {
    const byActivity = summaryQuery.data?.byActivity ?? {};
    return Object.fromEntries(
      Object.entries(byActivity).map(([k, v]) => [k, (v as { totalQuantity: number }).totalQuantity])
    );
  }, [summaryQuery.data?.byActivity]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
    setAddUnderId(null);
  };

  const openAddExpense = (underId: number | null = null) => {
    setEditingExpense(null);
    setAddUnderId(underId);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId === null) return;
    try {
      await deleteExpenseMutation.mutateAsync({ id: deletingId });
      resetExpenseList();
      await utils.expenseQuery.getExpenses.invalidate({ work_order_site_id: woSiteId });
      await utils.expenseQuery.getExpenseSummary.invalidate({ work_order_site_id: woSiteId });
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

    const all = expenses.map((exp): ExpenseRecord => {
      const activityKey = exp.activity_key ?? null;
      const activityMeta = activityKey
        ? (activityMetaByKey[activityKey] ?? { label: formatActivityLabel(activityKey), unit: null })
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
        description: exp.description,
        contractorId: exp.contractor_id ?? null,
        contractorName: exp.contractor_name ?? null,
        invoiceNumber: exp.invoice_number ?? null,
        documents: toDocuments(exp.documents),
        amount: Number(exp.amount),
      };
    });
    all.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    if (activityFilter === "__all__") return all;
    const filterKey = activityFilter === "__none__" ? null : activityFilter;
    return all.filter((r) => r.activityKey === filterKey);
  }, [expenses, activityOptions, activityFilter]);

  const renderRecordRow = (record: ExpenseRecord, showVendor = true) => {
    const { isExceeded } = record;
    const expense = expenses.find((e) => e.id === record.id);
    const documentCount = record.documents.length;

    return (
      <TableRow
        key={record.id}
        className={cn(
          "border-gray-100",
          isExceeded ? "bg-orange-50/40 hover:bg-orange-50/70" : "hover:bg-gray-50/80",
        )}>
        <TableCell className={cn(cellClass, "whitespace-nowrap text-xs tabular-nums text-gray-600")}>
          {formatDateRange(record.startDate, record.endDate)}
        </TableCell>
        {/* What was spent on, and against which activity. */}
        <TableCell className={cn(cellClass, "min-w-48")}>
          <p className='text-sm font-medium text-gray-900'>{record.description}</p>
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
        {showVendor && (
          <TableCell className={cn(cellClass, "text-xs text-gray-600")}>
            {record.contractorName ?? <span className='text-gray-300'>—</span>}
          </TableCell>
        )}
        {/* The invoice number with its documents beside it. */}
        <TableCell className={cn(cellClass, "text-xs text-gray-600")}>
          <div className='flex items-center gap-1.5'>
            {record.invoiceNumber ? (
              <span className='truncate'>{record.invoiceNumber}</span>
            ) : (
              documentCount === 0 && <span className='text-gray-300'>—</span>
            )}
            {documentCount > 0 && (
              <DocumentsMenu documents={record.documents}>
                <button
                  type='button'
                  aria-label={documentCount === 1 ? "View document" : `View ${documentCount} documents`}
                  title={documentCount === 1 ? "View document" : `View ${documentCount} documents`}
                  className='inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-blue-600 transition-colors hover:bg-blue-50'>
                  <Paperclip className='size-3.5' />
                  {documentCount > 1 && (
                    <span className='text-[11px] font-medium tabular-nums'>{documentCount}</span>
                  )}
                </button>
              </DocumentsMenu>
            )}
          </div>
        </TableCell>
        <TableCell className={cn(cellClass, "whitespace-nowrap text-right")}>
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              isExceeded ? "text-orange-700" : "text-gray-900",
            )}>
            {formatCurrency(record.amount)}
          </span>
        </TableCell>
        <TableCell className={cn(cellClass, "w-px whitespace-nowrap")}>
          <div className='flex items-center justify-end gap-0.5'>
            <button
              type='button'
              aria-label='Edit expense'
              title='Edit'
              onClick={() => expense && handleEdit(expense)}
              disabled={isViewer || !expense}
              className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30'>
              <Pencil className='size-3.5' />
            </button>
            <button
              type='button'
              aria-label='Delete expense'
              title='Delete'
              onClick={() => setDeletingId(record.id)}
              disabled={isViewer}
              className='rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30'>
              <Trash2 className='size-3.5' />
            </button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderRecordsTable = (rows: ExpenseRecord[], showVendor = true) => (
    <Table>
      <TableHeader>
        <TableRow className='border-gray-100 hover:bg-transparent'>
          <TableHead className={cn(headClass, "w-[120px]")}>Dates</TableHead>
          <TableHead className={headClass}>Expense</TableHead>
          <TableHead className={cn(headClass, "w-[90px] text-right")}>Qty</TableHead>
          {showVendor && <TableHead className={headClass}>Contractor</TableHead>}
          <TableHead className={cn(headClass, "w-[150px]")}>Invoice</TableHead>
          <TableHead className={cn(headClass, "w-[130px] text-right")}>Amount</TableHead>
          <TableHead className={cn(headClass, "w-px")}>
            <span className='sr-only'>Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{rows.map((r) => renderRecordRow(r, showVendor))}</TableBody>
    </Table>
  );

  // A records table for the vendor groups, scrolling sideways when narrow.
  const renderRecordsBox = (rows: ExpenseRecord[], showVendor = true) => (
    <div className='overflow-x-auto'>
      {renderRecordsTable(rows, showVendor)}
    </div>
  );

  const contractorIds = new Set(contractors.map((c) => c.id));
  const recordsUnder = (contractorId: number) =>
    records.filter((r) => r.contractorId === contractorId);
  // Miscellaneous: expenses under none of the site's vendors, including older
  // ones linked to a vendor that isn't one of them.
  const otherRecords = records.filter(
    (r) => r.contractorId === null || !contractorIds.has(r.contractorId),
  );
  const totalUnder = (contractorId: number): number =>
    summary?.byContractor?.[String(contractorId)] ?? 0;
  const contractorsTotal = contractors.reduce(
    (sum, c) => sum + totalUnder(c.id),
    0,
  );

  const toggleGroup = (key: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // A vendor's expenses, opened and closed by the arrow beside its name.
  const renderVendorGroup = ({
    groupKey,
    Icon,
    title,
    total,
    count,
    content,
    actions,
  }: {
    groupKey: string;
    Icon: React.ElementType;
    title: string;
    total: number;
    count: number;
    content: React.ReactNode;
    actions?: React.ReactNode;
  }) => {
    const isOpen = !collapsedGroups.has(groupKey);
    return (
      <div key={groupKey}>
        <div className='flex items-center gap-2 rounded-md px-1 py-1 hover:bg-gray-50'>
          <button
            type='button'
            onClick={() => toggleGroup(groupKey)}
            aria-expanded={isOpen}
            className='flex min-w-0 flex-1 items-center gap-2 text-left'>
            <ChevronRight
              className={cn(
                "size-4 shrink-0 text-gray-400 transition-transform",
                isOpen && "rotate-90",
              )}
            />
            <Icon className='size-3.5 shrink-0 text-purple-600' />
            <span className='truncate text-sm font-semibold text-gray-800'>{title}</span>
            <span className='shrink-0 rounded-full bg-gray-100 px-1.5 text-[10px] font-medium leading-4 text-gray-600'>
              {count}
            </span>
          </button>
          {actions}
          <span className='shrink-0 text-sm font-semibold tabular-nums text-gray-800'>
            {formatCurrency(total)}
          </span>
        </div>
        {isOpen && (
          <div className='flex gap-2 pb-1 pl-1'>
            <CornerDownRight className='mt-1 size-4 shrink-0 text-purple-300' />
            <div className='min-w-0 flex-1'>{content}</div>
          </div>
        )}
      </div>
    );
  };

  const emptyGroupText = (text: string) => (
    <p className='py-1 text-xs text-gray-400'>
      {text}
    </p>
  );

  return (
    <div className='space-y-4'>
      {showSummaryCards && (
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
          <div className='rounded-lg border bg-emerald-50/60 border-emerald-100 p-2.5'>
            <div className='flex items-center gap-1 mb-0.5'>
              <TrendingUp className='w-2.5 h-2.5 text-emerald-600' />
              <span className='text-[10px] font-semibold text-emerald-600 uppercase tracking-wider'>
                Income Earned
              </span>
            </div>
            <p className='text-sm font-bold text-emerald-700 leading-tight'>
              {summaryQuery.isLoading ? <span className='text-gray-400'>—</span> : formatCurrency(incomeTotal)}
            </p>
            <p className='text-[8px] text-emerald-600 mt-0.5'>From completed activities</p>
          </div>

          <div className='rounded-lg border border-gray-100 p-2.5 space-y-1'>
            <div className='flex items-center gap-1'>
              <TrendingDown className='w-2.5 h-2.5 text-gray-500' />
              <span className='text-[10px] font-semibold text-gray-500 uppercase tracking-wider'>
                Total Expenses
              </span>
            </div>
            <p className='text-sm font-bold text-gray-800 leading-tight'>
              {summaryQuery.isLoading ? <span className='text-gray-400'>—</span> : formatCurrency(expenseTotal)}
            </p>
            {exceededTotal > 0 && (
              <div className='flex flex-col gap-0.5 pt-1 border-t border-gray-100'>
                <span className='text-[8px] text-gray-400'>
                  Regular: {formatCurrency(regularTotal)}
                </span>
                <span className='text-[8px] text-orange-600 font-semibold flex items-center gap-1'>
                  <AlertTriangle className='w-2 h-2' />
                  Exceeded: {formatCurrency(exceededTotal)}
                </span>
              </div>
            )}
          </div>

          <div
            className={`rounded-lg border p-2.5 ${netPL >= 0 ? "bg-emerald-50/60 border-emerald-100" : "bg-orange-50/60 border-orange-100"}`}>
            <div className='flex items-center gap-1 mb-0.5'>
              <Minus className={`w-2.5 h-2.5 ${netPL >= 0 ? "text-emerald-600" : "text-orange-600"}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${netPL >= 0 ? "text-emerald-600" : "text-orange-600"}`}>
                Net P&amp;L
              </span>
            </div>
            <p className={`text-sm font-bold leading-tight ${netPL >= 0 ? "text-emerald-700" : "text-orange-700"}`}>
              {summaryQuery.isLoading ? <span className='text-gray-400'>—</span> : formatCurrency(Math.abs(netPL))}
            </p>
            <p className={`text-[8px] mt-0.5 ${netPL >= 0 ? "text-emerald-600" : "text-orange-600"}`}>
              {netPL >= 0 ? "Surplus" : "Deficit"}
            </p>
          </div>
        </div>
      )}

      {showEstimateTable && (
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
              {siteActivitiesQuery.data?.length ? `${siteActivitiesQuery.data.length} activities` : ""}
            </div>
          </div>

          {siteActivitiesQuery.isLoading ? (
            <div className='text-center py-4 text-gray-400 text-sm'>Loading...</div>
          ) : !siteActivitiesQuery.data || siteActivitiesQuery.data.length === 0 ? (
            <div className='text-center py-4 text-gray-400 text-sm'>No activities found.</div>
          ) : (
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
                  {siteActivitiesQuery.data
                    .map((a: any) => {
                      const estQty = getEstimateQty(a.activity);
                      if (estQty === null) return null;
                      const usedQty = usedQtyByActivity[a.activity] ?? 0;
                      const left = Math.max(0, estQty - usedQty);
                      const exhausted = estQty > 0 && left <= 0;
                      return (
                        <TableRow
                          key={a.id}
                          className={exhausted ? "bg-orange-50/30 hover:bg-orange-50/40" : "hover:bg-blue-50/20"}>
                          <TableCell className='py-2 text-xs text-gray-700 font-medium whitespace-nowrap'>
                            {formatActivityLabel(a.activity)}
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
                    })
                    .filter(Boolean)}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <h3 className='text-sm font-semibold text-gray-700 whitespace-nowrap'>Expense List</h3>
          {expenses.length > 0 && (
            <Badge variant='outline' className='text-[10px] px-1.5 py-0 h-4 bg-gray-50'>
              {expenses.length}
            </Badge>
          )}
          {exceededTotal > 0 && (
            <Badge variant='outline' className='text-[10px] px-1.5 py-0 h-4 bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-0.5'>
              <AlertTriangle className='w-2.5 h-2.5' />
              {formatCurrency(exceededTotal)} exceeded
            </Badge>
          )}
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className='h-8 text-xs w-full sm:w-[220px]'>
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
          {headerActions}
          <CustomButton
            text='Add Expense'
            variant='primary'
            Icon={Plus}
            onClick={() => openAddExpense()}
            className='h-8 text-xs'
            disableForViewer
          />
        </div>
      </div>

      {expensesQuery.isLoading && expensePage === 1 ? (
        <div className='text-center py-8 text-gray-400 text-sm'>Loading expenses...</div>
      ) : splitByContractor ? (
        <div className='space-y-1'>
          {contractors.length === 0 &&
            emptyGroupText("No vendors yet. Add a vendor to record expenses under it.")}
          {contractors.map((c) => {
            const name = capitalFirstLetter(c.name);
            const records = recordsUnder(c.id);
            const hasExpenses = records.length > 0 || totalUnder(c.id) > 0;
            return renderVendorGroup({
              groupKey: `vendor-${c.id}`,
              Icon: HardHat,
              title: name,
              total: totalUnder(c.id),
              count: records.length,
              content:
                records.length > 0
                  ? renderRecordsBox(records, false)
                  : emptyGroupText(`No expenses under ${name} yet.`),
              actions: (
                <div className='flex shrink-0 items-center gap-1'>
                  <button
                    type='button'
                    title={`Add expense under ${name}`}
                    aria-label={`Add expense under ${name}`}
                    onClick={() => openAddExpense(c.id)}
                    disabled={isViewer}
                    className='inline-flex h-7 items-center gap-1 rounded-md bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40'>
                    <Plus className='size-3.5' />
                    Add expense
                  </button>
                  {!hasExpenses && emptyVendorActions?.(c)}
                </div>
              ),
            });
          })}
          {renderVendorGroup({
            groupKey: "not-under-vendor",
            Icon: ReceiptIndianRupee,
            title: "Miscellaneous",
            total: expenseTotal - contractorsTotal,
            count: otherRecords.length,
            content:
              otherRecords.length > 0
                ? renderRecordsBox(otherRecords)
                : emptyGroupText("No miscellaneous expenses yet."),
          })}
          {expensesPagination && expensesPagination.total > expenses.length && (
            <p className='text-xs text-gray-400'>
              Showing {expenses.length} of {expensesPagination.total} entries
            </p>
          )}
        </div>
      ) : records.length === 0 ? (
        <div className='text-center py-10 border border-dashed rounded-xl bg-gray-50/30'>
          <ReceiptIndianRupee className='w-8 h-8 text-gray-300 mx-auto mb-2' />
          <p className='text-sm text-gray-500 font-medium'>No expenses yet</p>
          <p className='text-xs text-gray-400 mt-1'>
            Click &quot;Add Expense&quot; to record the first expense for this site.
          </p>
        </div>
      ) : (
        <div className='rounded-md border border-gray-100 overflow-x-auto'>
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
        activities={activityOptions}
        usedQtyByActivity={usedQtyByActivity}
        contractors={splitByContractor ? contractors : undefined}
        defaultContractorId={addUnderId}
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

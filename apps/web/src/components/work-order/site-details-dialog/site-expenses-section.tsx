"use client";
import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { constants } from "@pkg/utils";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Users,
  Package,
  Wrench,
  MoreHorizontal,
  ExternalLink,
  ReceiptIndianRupee,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import CustomButton from "@/components/shared/btn";
import { useIsViewer } from "@/contexts/AuthContext";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import AddExpenseDialog, {
  EXPENSE_TYPE_LABELS,
  ActivityOption,
  Expense,
} from "./add-expense-dialog";

type ExpenseRecordGroup = {
  key: string;
  activityKey: string | null;
  activityLabel: string;
  unit: string | null;
  expenseDate: string | Date;
  quantity: string | null;
  isExceeded: boolean;
  description: string;
  notes: string | null;
  contractorName: string | null;
  invoiceNumber: string | null;
  documentUrl: string | null;
  ids: number[];
  items: { id: number; expense_type: string; amount: number }[];
  totalAmount: number;
};

const EXPENSE_TYPE_ICONS: Record<string, React.ElementType> = {
  contractor_payment: HardHat,
  labour: Users,
  material: Package,
  equipment: Wrench,
  miscellaneous: MoreHorizontal,
};

const EXPENSE_TYPE_COLORS: Record<string, string> = {
  contractor_payment: "bg-blue-50 text-blue-700 border-blue-200",
  labour: "bg-orange-50 text-orange-700 border-orange-200",
  material: "bg-purple-50 text-purple-700 border-purple-200",
  equipment: "bg-cyan-50 text-cyan-700 border-cyan-200",
  miscellaneous: "bg-gray-50 text-gray-700 border-gray-200",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const formatActivityLabel = (key: string) =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const getExpenseRecordKey = (exp: Expense) =>
  [
    exp.activity_key ?? "__none__",
    String(exp.expense_date),
    exp.quantity ?? "",
    String(!!exp.is_exceeded),
    exp.description ?? "",
    exp.notes ?? "",
    exp.contractor_name ?? "",
    exp.invoice_number ?? "",
    exp.document_url ?? "",
  ].join("||");

interface Props {
  woSiteId: number;
  officeId: number;
  processType?: string;
}

const SiteExpensesSection = ({ woSiteId, officeId, processType }: Props) => {
  const utils = trpc.useUtils();
  const isViewer = useIsViewer();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingGroupIds, setDeletingGroupIds] = useState<number[] | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>("__all__");
  const [breakdownGroup, setBreakdownGroup] = useState<ExpenseRecordGroup | null>(null);

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

  const restorationDataQuery = trpc.workOrderSiteQuery.getRestorationData.useQuery(
    { work_order_site_id: woSiteId },
    { enabled: !!woSiteId && processType !== "bioremediation" },
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
    const data = restorationDataQuery.data;
    if (!data) return null;
    let qty: any;
    switch (activityKey) {
      case "clean_up_oil_spill":
      case "clean_soil_area":
      case constants.WO_ACTIVITIES.clean_soil_area:
        qty = data.cleaningUpSoilArea?.find((i: any) => i.type === estimateType)?.estimated_quantity;
        break;
      case "lifting_oil_slush":
      case constants.WO_ACTIVITIES.LIFTING_OILY_SLUSH_OR_RECOVERY_OF_OIL:
        qty = data.liftingRecoveryOilSlush?.find((i: any) => i.type === estimateType)?.estimated_quantity;
        break;
      case "excav_cont_soil":
      case constants.WO_ACTIVITIES.EXCAVATION_OIL_CONTAMINATED_SOIL:
        qty = data.excavationContSoil?.find((i: any) => i.type === estimateType)?.estimated_quantity;
        break;
      case "trans_cont_soil":
      case "trnsprt_oil_slush":
      case constants.WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL:
        qty = data.transportationContSoil?.find((i: any) => i.type === estimateType)?.estimated_quantity;
        break;
      case "refill_excav_soil":
      case constants.WO_ACTIVITIES.REFILLING_EXCAVATED_OIL_CONTAMINATED_SOIL_LAND:
        qty = data.refillingExcavatedContSoil?.find((i: any) => i.type === estimateType)?.estimated_quantity;
        break;
      default:
        return null;
    }
    return qty != null ? Number(qty) : null;
  };

  const activityOptions: ActivityOption[] = useMemo(() => {
    if (!siteActivitiesQuery.data) return [];
    return siteActivitiesQuery.data.map((a: any) => ({
      key: a.activity,
      label: formatActivityLabel(a.activity),
      unit: a.unit ?? "Nos",
      estimateQty: getEstimateQty(a.activity),
    }));
  }, [siteActivitiesQuery.data, restorationDataQuery.data, bioremediationDataQuery.data]);

  const usedQtyByActivity = useMemo(() => {
    const byActivity = summaryQuery.data?.byActivity ?? {};
    return Object.fromEntries(
      Object.entries(byActivity).map(([k, v]) => [k, (v as { totalQuantity: number }).totalQuantity])
    );
  }, [summaryQuery.data?.byActivity]);

  const { groupedExpenses, activityGroups } = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    for (const exp of expenses) {
      const key = exp.activity_key ?? "__none__";
      if (!groups[key]) groups[key] = [];
      groups[key]!.push(exp);
    }
    const orderedKeys: string[] = [];
    for (const a of activityOptions) {
      if (groups[a.key]) orderedKeys.push(a.key);
    }
    if (groups["__none__"]) orderedKeys.push("__none__");
    return { groupedExpenses: groups, activityGroups: orderedKeys };
  }, [expenses, activityOptions]);

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingExpense(null);
  };

  const confirmDelete = async () => {
    if (!deletingGroupIds || deletingGroupIds.length === 0) return;
    try {
      await Promise.all(deletingGroupIds.map((id) => deleteExpenseMutation.mutateAsync({ id })));
      resetExpenseList();
      await utils.expenseQuery.getExpenses.invalidate({ work_order_site_id: woSiteId });
      await utils.expenseQuery.getExpenseSummary.invalidate({ work_order_site_id: woSiteId });
      toast.success("Expense record deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete expense record");
    } finally {
      setDeletingGroupIds(null);
    }
  };

  const groupedRecordsByActivity = useMemo(() => {
    const activityLabelByKey: Record<string, { label: string; unit: string | null }> = {};
    for (const a of activityOptions) {
      activityLabelByKey[a.key] = { label: a.label, unit: a.unit ?? null };
    }

    const recordMap: Record<string, ExpenseRecordGroup> = {};
    for (const exp of expenses) {
      const activityKey = exp.activity_key ?? null;
      const activityMeta = activityKey
        ? (activityLabelByKey[activityKey] ?? { label: formatActivityLabel(activityKey), unit: null })
        : { label: "Other / Unlinked Expenses", unit: null };

      const recordKey = getExpenseRecordKey(exp);

      if (!recordMap[recordKey]) {
        recordMap[recordKey] = {
          key: recordKey,
          activityKey,
          activityLabel: activityMeta.label,
          unit: activityMeta.unit,
          expenseDate: exp.expense_date,
          quantity: exp.quantity ?? null,
          isExceeded: !!exp.is_exceeded,
          description: exp.description,
          notes: exp.notes ?? null,
          contractorName: exp.contractor_name ?? null,
          invoiceNumber: exp.invoice_number ?? null,
          documentUrl: exp.document_url ?? null,
          ids: [],
          items: [],
          totalAmount: 0,
        };
      }

      recordMap[recordKey]!.ids.push(exp.id);
      recordMap[recordKey]!.items.push({
        id: exp.id,
        expense_type: exp.expense_type,
        amount: Number(exp.amount),
      });
      recordMap[recordKey]!.totalAmount += Number(exp.amount);
    }

    const byActivity: Record<string, ExpenseRecordGroup[]> = {};
    for (const group of Object.values(recordMap)) {
      const k = group.activityKey ?? "__none__";
      if (!byActivity[k]) byActivity[k] = [];
      byActivity[k]!.push(group);
    }

    for (const k of Object.keys(byActivity)) {
      byActivity[k]!.sort((a, b) => {
        const da = new Date(a.expenseDate).getTime();
        const db = new Date(b.expenseDate).getTime();
        return db - da;
      });
    }

    return byActivity;
  }, [expenses, activityOptions]);

  const recordGroupsFlat = useMemo(() => {
    const groups: ExpenseRecordGroup[] = [];
    for (const k of activityGroups) {
      groups.push(...(groupedRecordsByActivity[k] ?? []));
    }
    groups.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
    if (activityFilter === "__all__") return groups;
    const filterKey = activityFilter === "__none__" ? null : activityFilter;
    return groups.filter((g) => g.activityKey === filterKey);
  }, [activityGroups, groupedRecordsByActivity, activityFilter]);

  const renderRecordRow = (group: ExpenseRecordGroup) => {
    const isExceeded = group.isExceeded;
    const uniqueTypes = Array.from(new Set(group.items.map((i) => i.expense_type)));
    const primaryExpenseForEdit: Expense | undefined =
      expenses.find((e) => e.id === group.ids[0]) ?? expenses.find((e) => group.ids.includes(e.id));

    return (
      <TableRow
        key={group.key}
        onClick={() => setBreakdownGroup(group)}
        role='button'
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setBreakdownGroup(group);
        }}
        className={`transition-colors ${isExceeded ? "bg-orange-50/40 hover:bg-orange-50/70" : "hover:bg-blue-50/20"}`}>
        <TableCell className='text-xs text-gray-600 py-2.5'>
          {format(new Date(group.expenseDate), "dd MMM yyyy")}
        </TableCell>
        <TableCell className='py-2.5'>
          <span className='text-xs text-gray-800 font-medium'>{group.activityLabel}</span>
        </TableCell>
        <TableCell className='py-2.5'>
          <div className='flex flex-wrap gap-1.5'>
            {uniqueTypes.map((t) => {
              const Icon = EXPENSE_TYPE_ICONS[t] ?? MoreHorizontal;
              return (
                <Badge
                  key={t}
                  variant='outline'
                  className={`text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit ${EXPENSE_TYPE_COLORS[t] ?? ""}`}>
                  <Icon className='w-2.5 h-2.5' />
                  {EXPENSE_TYPE_LABELS[t] ?? t}
                </Badge>
              );
            })}
            {isExceeded && (
              <Badge
                variant='outline'
                className='text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit bg-orange-50 text-orange-700 border-orange-200'>
                <AlertTriangle className='w-2.5 h-2.5' />
                Exceeded
              </Badge>
            )}
          </div>
          {group.ids.length > 1 && (
            <div className='text-[10px] text-gray-400 mt-1'>
              {group.ids.length} expense items
            </div>
          )}
        </TableCell>
        <TableCell className='py-2.5'>
          <div className='flex flex-col'>
            <span className='text-xs text-gray-800 font-medium'>{group.description}</span>
            {group.notes && <span className='text-[10px] text-gray-400 line-clamp-1'>{group.notes}</span>}
          </div>
        </TableCell>
        <TableCell className='py-2.5 text-xs text-gray-600 text-center tabular-nums'>
          {group.quantity ? (
            <span className='font-medium'>{Number(group.quantity)}</span>
          ) : (
            <span className='text-gray-300'>—</span>
          )}
          {group.unit ? <span className='text-gray-400 ml-1'>{group.unit}</span> : null}
        </TableCell>
        <TableCell className='py-2.5 text-xs text-gray-600'>
          {group.contractorName ?? <span className='text-gray-300'>—</span>}
        </TableCell>
        <TableCell className='py-2.5 text-xs text-gray-500'>
          {group.invoiceNumber ?? <span className='text-gray-300'>—</span>}
        </TableCell>
        <TableCell className='py-2.5 text-center'>
          {group.documentUrl ? (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={group.documentUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors'>
                    <ExternalLink className='w-3 h-3' />
                  </a>
                </TooltipTrigger>
                <TooltipContent side='top' className='text-[10px] px-2 py-1 bg-gray-900 text-white'>
                  View Document
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className='text-gray-300 text-xs'>—</span>
          )}
        </TableCell>
        <TableCell className='py-2.5 text-right'>
          <span className={`text-sm font-semibold ${isExceeded ? "text-orange-700" : "text-red-700"}`}>
            {formatCurrency(group.totalAmount)}
          </span>
        </TableCell>
        <TableCell className='py-2.5'>
          <div className='flex items-center justify-end gap-1'>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      if (primaryExpenseForEdit) handleEdit(primaryExpenseForEdit);
                    }}
                    disabled={isViewer || !primaryExpenseForEdit}
                    className='p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-30'>
                    <Pencil className='w-3 h-3' />
                  </button>
                </TooltipTrigger>
                <TooltipContent side='top' className='text-[10px] px-2 py-1 bg-gray-900 text-white'>
                  Edit
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingGroupIds(group.ids);
                    }}
                    disabled={isViewer}
                    className='p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed'>
                    <Trash2 className='w-3 h-3' />
                  </button>
                </TooltipTrigger>
                <TooltipContent side='top' className='text-[10px] px-2 py-1 bg-gray-900 text-white'>
                  Delete
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className='space-y-4'>
      <Dialog open={!!breakdownGroup} onOpenChange={(v) => !v && setBreakdownGroup(null)}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>Expense breakdown</DialogTitle>
            <DialogDescription>
              {breakdownGroup?.activityLabel ? `${breakdownGroup.activityLabel} · ` : ""}
              {breakdownGroup?.expenseDate ? format(new Date(breakdownGroup.expenseDate), "dd MMM yyyy") : ""}
            </DialogDescription>
          </DialogHeader>
          {breakdownGroup && (
            <div className='space-y-3'>
              <div className='rounded-md border overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow className='bg-gray-50/60 hover:bg-gray-50/60'>
                      <TableHead className='text-xs font-semibold text-gray-600 whitespace-nowrap'>Type</TableHead>
                      <TableHead className='text-xs font-semibold text-gray-600 text-right whitespace-nowrap'>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breakdownGroup.items.map((item) => (
                      <TableRow key={item.id} className='hover:bg-transparent'>
                        <TableCell className='py-2 text-xs text-gray-700'>
                          {EXPENSE_TYPE_LABELS[item.expense_type] ?? item.expense_type}
                        </TableCell>
                        <TableCell className='py-2 text-xs text-right tabular-nums font-semibold text-gray-800'>
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className='flex items-center justify-between text-xs'>
                <span className='text-gray-500'>
                  {breakdownGroup.items.length} item{breakdownGroup.items.length !== 1 ? "s" : ""}
                </span>
                <span className='font-semibold text-gray-900'>
                  Total: {formatCurrency(breakdownGroup.totalAmount)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <ReceiptIndianRupee className='w-4 h-4 text-gray-400' />
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
          <CustomButton
            text='Add Expense'
            variant='primary'
            Icon={Plus}
            onClick={() => { setEditingExpense(null); setDialogOpen(true); }}
            className='h-8 text-xs'
            disableForViewer
          />
        </div>
      </div>

      {expensesQuery.isLoading && expensePage === 1 ? (
        <div className='text-center py-8 text-gray-400 text-sm'>Loading expenses...</div>
      ) : recordGroupsFlat.length === 0 ? (
        <div className='text-center py-10 border border-dashed rounded-xl bg-gray-50/30'>
          <ReceiptIndianRupee className='w-8 h-8 text-gray-300 mx-auto mb-2' />
          <p className='text-sm text-gray-500 font-medium'>No expenses yet</p>
          <p className='text-xs text-gray-400 mt-1'>
            Click &quot;Add Expense&quot; to record the first expense for this site.
          </p>
        </div>
      ) : (
        <div className='rounded-md border border-gray-100 overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50/50 hover:bg-gray-50/50'>
                <TableHead className='text-xs font-semibold text-gray-600 w-[110px] whitespace-nowrap'>Date</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 whitespace-nowrap'>Activity</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 whitespace-nowrap'>Type</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 whitespace-nowrap'>Description</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 text-center w-[90px] whitespace-nowrap'>Qty</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 whitespace-nowrap'>Contractor</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 whitespace-nowrap'>Invoice #</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 text-center w-[60px] whitespace-nowrap'>Doc</TableHead>
                <TableHead className='text-xs font-semibold text-gray-600 text-right whitespace-nowrap'>Amount (₹)</TableHead>
                <TableHead className='w-[70px]' />
              </TableRow>
            </TableHeader>
            <TableBody>{recordGroupsFlat.map((g) => renderRecordRow(g))}</TableBody>
          </Table>

          <div className='flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t text-xs'>
            <span className='text-gray-500'>
              {recordGroupsFlat.length} record{recordGroupsFlat.length !== 1 ? "s" : ""}
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
        officeId={officeId}
        editingExpense={editingExpense}
        activities={activityOptions}
        usedQtyByActivity={usedQtyByActivity}
      />

      <AlertDialog
        open={deletingGroupIds !== null}
        onOpenChange={(v) => !v && setDeletingGroupIds(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the expense record (all its expense items). This action cannot be undone.
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

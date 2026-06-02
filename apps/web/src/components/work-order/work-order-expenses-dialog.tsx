"use client";
import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  ReceiptIndianRupee,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import DialogWindow from "@/components/shared/dialog-window";
import { trpc } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { formatCurrency } from "@pkg/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EXPENSE_TYPE_LABELS } from "./site-details-dialog/add-expense-dialog";

interface Props {
  workOrderId: number;
  workOrderCode?: string;
}

const formatActivityLabel = (key: string) =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const WorkOrderExpensesDialog = ({ workOrderId, workOrderCode }: Props) => {
  const { getParam, deleteParams, setParams } = useHandleParams();
  const isOpen = getParam("dialog") === "all-expenses";
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState<string>("__all__");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [onlyExceeded, setOnlyExceeded] = useState(false);

  const query = trpc.expenseQuery.getExpensesByWorkOrder.useQuery(
    { work_order_id: workOrderId },
    { enabled: isOpen && workOrderId > 0 },
  );

  const expenses = query.data?.expenses ?? [];

  const siteOptions = useMemo(() => {
    const seen = new Map<number, string>();
    for (const e of expenses as any[]) {
      if (e.work_order_site_id && !seen.has(e.work_order_site_id)) {
        seen.set(e.work_order_site_id, e.site_name || `Site ${e.site_id}`);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e: any) => {
      if (siteFilter !== "__all__" && String(e.work_order_site_id) !== siteFilter)
        return false;
      if (typeFilter !== "__all__" && e.expense_type !== typeFilter) return false;
      if (onlyExceeded && !e.is_exceeded) return false;
      if (!q) return true;
      const hay = [
        e.description,
        e.notes,
        e.contractor_name,
        e.invoice_number,
        e.site_name,
        e.activity_key,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [expenses, search, siteFilter, typeFilter, onlyExceeded]);

  const totals = useMemo(() => {
    let total = 0;
    let exceeded = 0;
    for (const e of filtered) {
      const amt = Number(e.amount || 0);
      total += amt;
      if (e.is_exceeded) exceeded += amt;
    }
    return {
      total,
      exceeded,
      regular: total - exceeded,
      count: filtered.length,
    };
  }, [filtered]);

  const handleClose = (open: boolean) => {
    if (open) return;
    setIsFullScreen(false);
    deleteParams(["dialog"]);
  };

  const openSite = (woSiteId: number) => {
    setParams({ dialog: "site-details", "wo-site-id": String(woSiteId) });
  };

  return (
    <DialogWindow
      open={isOpen}
      setOpen={handleClose}
      title={`Expenses${workOrderCode ? ` — ${workOrderCode.toUpperCase()}` : ""}`}
      description='All expense records across every site of this work order'
      size='2xl'
      isFullScreen={isFullScreen}
      onToggleFullScreen={() => setIsFullScreen((v) => !v)}
      isLoading={query.isLoading}>
      <div className='space-y-4 py-3'>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <div className='rounded-xl border bg-white px-4 py-3'>
            <div className='flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1'>
              <TrendingDown className='size-3' /> Total
            </div>
            <p className='text-base font-bold text-slate-800'>
              {formatCurrency(totals.total)}
            </p>
          </div>
          <div className='rounded-xl border bg-white px-4 py-3'>
            <div className='flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1'>
              <TrendingUp className='size-3' /> Regular
            </div>
            <p className='text-base font-bold text-emerald-700'>
              {formatCurrency(totals.regular)}
            </p>
          </div>
          <div className='rounded-xl border bg-white px-4 py-3'>
            <div className='flex items-center gap-1.5 text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1'>
              <AlertTriangle className='size-3' /> Exceeded
            </div>
            <p
              className={`text-base font-bold ${totals.exceeded > 0 ? "text-orange-700" : "text-slate-400"}`}>
              {formatCurrency(totals.exceeded)}
            </p>
          </div>
          <div className='rounded-xl border bg-white px-4 py-3'>
            <div className='flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1'>
              <ReceiptIndianRupee className='size-3' /> Records
            </div>
            <p className='text-base font-bold text-slate-800'>
              {totals.count.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search description, contractor, invoice…'
              className='h-9 pl-8 text-xs'
            />
          </div>

          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className='h-9 text-xs w-[180px]'>
              <SelectValue placeholder='Site' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>All sites</SelectItem>
              {siteOptions.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className='h-9 text-xs w-[160px]'>
              <SelectValue placeholder='Type' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>All types</SelectItem>
              {Object.entries(EXPENSE_TYPE_LABELS).map(([v, label]) => (
                <SelectItem key={v} value={v}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type='button'
            onClick={() => setOnlyExceeded((v) => !v)}
            className={`h-9 px-3 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
              onlyExceeded
                ? "bg-orange-50 border-orange-300 text-orange-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <AlertTriangle className='size-3.5' />
            Exceeded only
          </button>
        </div>

        <div className='rounded-xl border overflow-hidden bg-white'>
          <Table className='w-full text-xs'>
            <TableHeader>
              <TableRow className='border-b bg-slate-50/60'>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Date
                </TableHead>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Site
                </TableHead>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Activity
                </TableHead>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Type
                </TableHead>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Contractor
                </TableHead>
                <TableHead className='h-9 px-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Qty
                </TableHead>
                <TableHead className='h-9 px-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Amount
                </TableHead>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Description
                </TableHead>
                <TableHead className='h-9 px-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Doc
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className='text-center py-10 text-slate-400 italic'>
                    {query.isLoading
                      ? "Loading…"
                      : expenses.length === 0
                        ? "No expenses logged for this work order yet."
                        : "No expenses match the current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e: any) => {
                  const isExceeded = !!e.is_exceeded;
                  return (
                    <TableRow
                      key={e.id}
                      className={`border-b last:border-0 hover:bg-slate-50/60 transition-colors ${isExceeded ? "bg-orange-50/30" : ""}`}>
                      <TableCell className='px-3 py-2 whitespace-nowrap text-slate-600'>
                        {e.expense_date
                          ? format(new Date(e.expense_date), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        <button
                          type='button'
                          onClick={() => openSite(e.work_order_site_id)}
                          className='text-slate-700 font-medium hover:text-blue-600 inline-flex items-center gap-1 transition-colors'>
                          {e.site_name || `Site ${e.site_id}`}
                          <ExternalLink className='size-3 opacity-60' />
                        </button>
                      </TableCell>
                      <TableCell className='px-3 py-2 text-slate-600'>
                        {e.activity_key
                          ? formatActivityLabel(e.activity_key)
                          : "—"}
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        <Badge
                          variant='outline'
                          className='text-[10px] font-normal bg-white'>
                          {EXPENSE_TYPE_LABELS[e.expense_type] ?? e.expense_type}
                        </Badge>
                      </TableCell>
                      <TableCell className='px-3 py-2 text-slate-600'>
                        {e.contractor_name ?? "—"}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right tabular-nums text-slate-600'>
                        {e.quantity ? Number(e.quantity).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-right tabular-nums'>
                        <div className='flex items-center justify-end gap-1.5'>
                          {isExceeded && (
                            <AlertTriangle className='size-3 text-orange-500' />
                          )}
                          <span
                            className={`font-semibold ${isExceeded ? "text-orange-700" : "text-slate-800"}`}>
                            {formatCurrency(Number(e.amount || 0))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='px-3 py-2 text-slate-600 max-w-[260px] truncate'>
                        {e.description || "—"}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-center'>
                        {e.document_url ? (
                          <a
                            href={e.document_url}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors'>
                            <FileText className='size-3.5' />
                          </a>
                        ) : (
                          <span className='text-slate-300'>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DialogWindow>
  );
};

export default WorkOrderExpensesDialog;

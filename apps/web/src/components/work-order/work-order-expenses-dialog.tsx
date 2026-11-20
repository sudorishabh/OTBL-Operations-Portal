"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import LoadMoreBtn from "@/components/loading/LoadMoreBtn";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";
import DocumentsMenu from "@/components/shared/documents-menu";
import { toDocuments } from "@/lib/documents";
import { formatDateRange } from "@/lib/wo-site-display";
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
import { trpc, type RouterOutputs } from "@/lib/trpc";
import useHandleParams from "@/hooks/useHandleParams";
import { formatCurrency } from "@pkg/utils";
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

interface Props {
  workOrderId: number;
  workOrderCode?: string;
}

const PAGE_SIZE = 25;

type ExpensesPage = RouterOutputs["expenseQuery"]["getExpensesByWorkOrder"];

const formatActivityLabel = (key: string) =>
  key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const WorkOrderExpensesDialog = ({ workOrderId, workOrderCode }: Props) => {
  const { getParam, deleteParams } = useHandleParams();
  const router = useRouter();
  const pathname = usePathname();
  const isOpen = getParam("dialog") === "all-expenses";
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState<string>("__all__");
  const [onlyExceeded, setOnlyExceeded] = useState(false);
  const debouncedSearch = useDebounce(search.trim(), 300);

  // The server filters, totals and pages the expenses.
  const queryInput = {
    work_order_id: workOrderId,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    work_order_site_id:
      siteFilter === "__all__" ? undefined : Number(siteFilter),
    exceeded_only: onlyExceeded || undefined,
  };
  const { pages, loadMore } = useLoadMorePages(queryInput);

  // Each page is its own query, so a refresh updates the rows in place. A
  // new filter keeps the last rows in view until its first page arrives.
  const pageQueries: UseQueryResult<ExpensesPage>[] = trpc.useQueries(
    (t: any) =>
      pages.map((page) =>
        t.expenseQuery.getExpensesByWorkOrder(
          { ...queryInput, page },
          {
            enabled: isOpen && workOrderId > 0,
            placeholderData: page === 1 ? keepPreviousData : undefined,
          },
        ),
      ),
  );

  const firstPage = pageQueries[0]?.data;
  const lastPage = pageQueries.at(-1)?.data;
  const filtered = pageQueries.flatMap((query) => query.data?.expenses ?? []);
  const isLoading = !!pageQueries[0]?.isLoading;
  const isFetchingMore = pages.length > 1 && !!pageQueries.at(-1)?.isLoading;
  const isFiltered =
    !!debouncedSearch || siteFilter !== "__all__" || onlyExceeded;

  const siteOptions = firstPage?.sites ?? [];
  const totals = firstPage?.totals ?? {
    total: 0,
    exceeded: 0,
    regular: 0,
    count: 0,
  };

  const handleClose = (open: boolean) => {
    if (open) return;
    setIsFullScreen(false);
    setSearch("");
    setSiteFilter("__all__");
    setOnlyExceeded(false);
    deleteParams(["dialog"]);
  };

  // The site's page, or the restoration's, which has no site.
  const openSite = (expense: {
    work_order_site_id: number;
    site_id: number | null;
  }) => {
    router.push(
      expense.site_id == null
        ? `${pathname}/restoration`
        : `${pathname}/sites/${expense.work_order_site_id}`,
    );
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
      isLoading={isLoading}
      loadingSkeleton='list'>
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
              placeholder='Search title, contractor, invoice…'
              className='h-9 pl-8 text-xs'
            />
          </div>

          <Select
            value={siteFilter}
            onValueChange={setSiteFilter}>
            <SelectTrigger className='h-9 text-xs w-[180px]'>
              <SelectValue placeholder='Site' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>All sites</SelectItem>
              {siteOptions.map((s) => (
                <SelectItem
                  key={s.id}
                  value={String(s.id)}>
                  {s.name}
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
                  Dates
                </TableHead>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Site
                </TableHead>
                <TableHead className='h-9 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider'>
                  Activity
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
                  Title
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
                    colSpan={8}
                    className='text-center py-10 text-slate-400 italic'>
                    {isFiltered
                      ? "No expenses match the current filters."
                      : "No expenses logged for this work order yet."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e: any) => {
                  const isExceeded = !!e.is_exceeded;
                  const documents = toDocuments(e.documents);
                  return (
                    <TableRow
                      key={e.id}
                      className={`border-b last:border-0 hover:bg-slate-50/60 transition-colors ${isExceeded ? "bg-orange-50/30" : ""}`}>
                      <TableCell className='px-3 py-2 whitespace-nowrap text-slate-600'>
                        {formatDateRange(e.start_date, e.end_date)}
                      </TableCell>
                      <TableCell className='px-3 py-2'>
                        <button
                          type='button'
                          onClick={() => openSite(e)}
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
                        {e.title || "—"}
                      </TableCell>
                      <TableCell className='px-3 py-2 text-center'>
                        {documents.length > 0 ? (
                          <DocumentsMenu
                            documents={documents}
                            align='center'>
                            <button
                              type='button'
                              aria-label='View documents'
                              className='inline-flex cursor-pointer items-center justify-center gap-0.5 text-slate-400 hover:text-blue-600 transition-colors'>
                              <FileText className='size-3.5' />
                              {documents.length > 1 && (
                                <span className='text-[10px] font-semibold tabular-nums'>
                                  {documents.length}
                                </span>
                              )}
                            </button>
                          </DocumentsMenu>
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
          {filtered.length > 0 && (
            <div className='border-t px-3 py-2.5'>
              <p className='text-center text-xs text-slate-500'>
                Showing {filtered.length.toLocaleString("en-IN")} of{" "}
                {totals.count.toLocaleString("en-IN")}
              </p>
              {lastPage?.pagination.hasMore && (
                <LoadMoreBtn
                  onClick={loadMore}
                  loading={isFetchingMore}
                  className='pt-2'
                />
              )}
            </div>
          )}
        </div>
      </div>
    </DialogWindow>
  );
};

export default WorkOrderExpensesDialog;

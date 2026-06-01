"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import DialogWindow from "@/components/shared/dialog-window";
import { trpc } from "@/lib/trpc";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Mail, Save, Search, Users, X } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useApiError } from "@/hooks/useApiError";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  woSiteId: number;
  onSaved?: () => void;
};

type OperatorRow = {
  user_id: number;
  name: string | null;
  email: string | null;
};

type CandidateRow = OperatorRow & { assigned: boolean };

const PAGE_SIZE = 20;

/**
 * Paginated, server-searched operator picker for a single WO-site. Built for
 * pools of hundreds of Site Operators: candidates page in on demand and search
 * runs server-side, while the current selection (which may include operators on
 * other pages) is rendered from a separate small "assigned" query and a local
 * details map so chips and checkboxes stay accurate across pages/searches.
 */
const WoSiteOperatorsDialog: React.FC<Props> = ({
  open,
  setOpen,
  woSiteId,
  onSaved,
}) => {
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<
    { user_id: number; name: string | null; email: string | null; assigned: boolean }[]
  >([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Names/emails for selected operators not necessarily on the current page,
  // so chips render correctly regardless of paging/search.
  const [details, setDetails] = useState<Map<number, OperatorRow>>(new Map());
  const [seeded, setSeeded] = useState(false);

  const enabled = open && woSiteId > 0;

  const { data: assignedData } =
    trpc.workOrderSiteQuery.getWorkOrderSiteAssignedOperators.useQuery(
      { work_order_site_id: woSiteId },
      { enabled, retry: false },
    );

  const { data: pageData, isLoading: loadingPage } =
    trpc.workOrderSiteQuery.getWorkOrderSiteOperatorsPaginated.useQuery(
      {
        work_order_site_id: woSiteId,
        page,
        limit: PAGE_SIZE,
        search,
      },
      { enabled, retry: false },
    );

  // Seed the live selection from the server truth once per open.
  useEffect(() => {
    if (!assignedData || seeded) return;
    const assigned: OperatorRow[] = assignedData;
    setSelected(new Set(assigned.map((o) => o.user_id)));
    setDetails((prev) => {
      const next = new Map(prev);
      for (const o of assigned) {
        next.set(o.user_id, {
          user_id: o.user_id,
          name: o.name,
          email: o.email,
        });
      }
      return next;
    });
    setSeeded(true);
  }, [assignedData, seeded]);

  // Reset paging + accumulated rows whenever the search term changes.
  useEffect(() => {
    setPage(1);
    setResults([]);
  }, [search]);

  // Accumulate paged rows (de-duped) and capture details for any selected rows.
  useEffect(() => {
    if (!pageData?.operators) return;
    const ops: CandidateRow[] = pageData.operators;
    setResults((prev) => {
      if (page === 1) return ops;
      const ids = new Set(prev.map((u) => u.user_id));
      return [...prev, ...ops.filter((u) => !ids.has(u.user_id))];
    });
    setDetails((prev) => {
      const next = new Map(prev);
      for (const o of ops) {
        next.set(o.user_id, {
          user_id: o.user_id,
          name: o.name,
          email: o.email,
        });
      }
      return next;
    });
  }, [pageData?.operators, page]);

  const saveMutation =
    trpc.workOrderSiteMutation.setWorkOrderSiteOperators.useMutation({
      onSuccess: async () => {
        toast.success("Operators updated");
        await Promise.all([
          utils.workOrderSiteQuery.getWorkOrderSiteAssignedOperators.invalidate(
            { work_order_site_id: woSiteId },
          ),
          utils.workOrderSiteQuery.getWorkOrderSiteOperatorsPaginated.invalidate(
            { work_order_site_id: woSiteId },
          ),
        ]);
        onSaved?.();
        setOpen(false);
      },
      onError: (e: unknown) => handleError(e, { showToast: true }),
    });

  const toggle = useCallback((row: OperatorRow) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(row.user_id)) next.delete(row.user_id);
      else next.add(row.user_id);
      return next;
    });
    setDetails((prev) => {
      if (prev.has(row.user_id)) return prev;
      const next = new Map(prev);
      next.set(row.user_id, row);
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Reset transient picker state so the next open re-seeds from the server.
    setSearch("");
    setPage(1);
    setResults([]);
    setSeeded(false);
  }, [setOpen]);

  const handleSave = () => {
    saveMutation.mutate({
      work_order_site_id: woSiteId,
      user_ids: [...selected],
    });
  };

  const hasMore = pageData?.pagination?.hasMore ?? false;
  const total = pageData?.pagination?.total ?? 0;

  const selectedChips = useMemo(
    () =>
      [...selected]
        .map((id) => details.get(id))
        .filter((d): d is OperatorRow => Boolean(d))
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [selected, details],
  );

  return (
    <DialogWindow
      open={open}
      setOpen={(o) => (o ? setOpen(true) : handleClose())}
      title='Assign site operators'
      description='Only operators assigned here can upload documents to this work order site.'
      size='lg'
      heightMode='full'>
      <div className='flex h-full flex-col gap-4 py-2'>
        {/* Selected summary + chips */}
        <div className='rounded-lg border bg-slate-50/80 p-3'>
          <div className='mb-2 flex items-center gap-2'>
            <Users className='h-3.5 w-3.5 text-emerald-600' />
            <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
              Selected
            </span>
            <Badge variant='outline' className='text-[10px]'>
              {selected.size}
            </Badge>
          </div>
          {selectedChips.length === 0 ? (
            <p className='text-xs text-slate-500'>
              No operators selected yet.
            </p>
          ) : (
            <div className='flex max-h-24 flex-wrap gap-2 overflow-y-auto'>
              {selectedChips.map((o) => (
                <span
                  key={o.user_id}
                  className='inline-flex items-center gap-1.5 rounded-full border bg-white py-1 pl-2.5 pr-1 text-xs'>
                  <span className='font-medium'>
                    {o.name ? capitalizeEachWord(o.name) : `User ${o.user_id}`}
                  </span>
                  <button
                    type='button'
                    onClick={() => toggle(o)}
                    className='rounded-full p-0.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600'
                    aria-label={`Remove ${o.name ?? `User ${o.user_id}`}`}>
                    <X className='h-3 w-3' />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <Input
          mode='standalone'
          placeholder='Search operators by name or email...'
          value={search}
          onChange={(value) => setSearch(value)}
          inputIcon={Search}
          className='max-w-md'
        />

        {/* Candidate list */}
        <ScrollArea className='flex-1 min-h-0 -mr-3 pr-3'>
          {loadingPage && results.length === 0 ? (
            <div className='space-y-2'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className='h-12 animate-pulse rounded-md bg-muted/60'
                />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-slate-500'>
              <Users className='mb-2 h-8 w-8 text-slate-400' />
              <p className='text-sm'>
                {search.trim()
                  ? "No operators match your search"
                  : "No site operators exist yet"}
              </p>
              {!search.trim() && (
                <p className='mt-1 text-[11px] text-muted-foreground'>
                  Create users with the Site Operator role first.
                </p>
              )}
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
              {results.map((o) => {
                const checked = selected.has(o.user_id);
                return (
                  <label
                    key={o.user_id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-md border bg-white p-2.5 text-xs transition-colors",
                      checked
                        ? "border-emerald-300 bg-emerald-50/40"
                        : "hover:bg-muted/30",
                    )}>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggle(o)}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-medium'>
                        {o.name
                          ? capitalizeEachWord(o.name)
                          : `User ${o.user_id}`}
                      </p>
                      {o.email && (
                        <p className='flex items-center gap-1 truncate text-muted-foreground'>
                          <Mail className='h-3 w-3 shrink-0' />
                          <span className='truncate'>{o.email}</span>
                        </p>
                      )}
                    </div>
                    {checked && (
                      <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
                    )}
                  </label>
                );
              })}
              {hasMore && (
                <button
                  type='button'
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loadingPage}
                  className='col-span-full rounded-md border border-dashed py-2.5 text-xs font-medium text-slate-500 transition-colors hover:text-emerald-700 disabled:opacity-50'>
                  {loadingPage ? "Loading..." : "Load more operators..."}
                </button>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className='flex items-center justify-between border-t pt-3'>
          <span className='text-[11px] text-muted-foreground'>
            {total > 0
              ? `Showing ${results.length} of ${total} site operators`
              : ""}
          </span>
          <div className='flex items-center gap-2'>
            <CustomButton
              type='button'
              variant='outline'
              text='Cancel'
              onClick={handleClose}
              disabled={saveMutation.isPending}
            />
            <CustomButton
              type='button'
              variant='primary'
              Icon={Save}
              text='Save'
              onClick={handleSave}
              disabled={saveMutation.isPending}
              loading={saveMutation.isPending}
              disableForViewer
            />
          </div>
        </div>
      </div>
    </DialogWindow>
  );
};

export default WoSiteOperatorsDialog;

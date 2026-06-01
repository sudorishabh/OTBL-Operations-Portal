"use client";

import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import { Users, Save, Search, Mail } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useIsManager } from "@/contexts/AuthContext";
import { useApiError } from "@/hooks/useApiError";

type Props = {
  woSiteId: number;
};

/** Row shape returned by getWorkOrderSiteOperatorAssignments. Declared locally
 * because the deep tRPC router inference widens this query's output to `any`
 * in the built type declarations. */
type OperatorRow = {
  user_id: number;
  name: string | null;
  email: string | null;
  assigned: boolean;
};

/**
 * Manager-only control to pin specific operators to a single work-order site.
 * Only pinned operators can upload documents to this WO-site (enforced server
 * -side via getAccessScope / assertCanAccessWorkOrderSite). The candidate pool
 * is every Site Operator (global role) — assignment is per-WO-site.
 */
const WoSiteOperatorsSection: React.FC<Props> = ({ woSiteId }) => {
  const isManager = useIsManager();
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);

  const { data, isLoading, isError } =
    trpc.workOrderSiteQuery.getWorkOrderSiteOperatorAssignments.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: isManager && woSiteId > 0, retry: false },
    );

  // Reset local selection to the server truth whenever fresh data arrives.
  useEffect(() => {
    if (!data) return;
    const rows: OperatorRow[] = data;
    setSelected(
      new Set(rows.filter((o) => o.assigned).map((o) => o.user_id)),
    );
    setDirty(false);
  }, [data]);

  const saveMutation =
    trpc.workOrderSiteMutation.setWorkOrderSiteOperators.useMutation({
      onSuccess: async () => {
        toast.success("Operators updated");
        await utils.workOrderSiteQuery.getWorkOrderSiteOperatorAssignments.invalidate(
          { work_order_site_id: woSiteId },
        );
      },
      onError: (e: unknown) => handleError(e, { showToast: true }),
    });

  // Hidden for non-managers, and for managers who lack authority on this
  // office (the query 403s → isError).
  if (!isManager || isError) return null;

  const operators: OperatorRow[] = data ?? [];
  const query = search.trim().toLowerCase();
  const filtered = query
    ? operators.filter(
        (o) =>
          (o.name ?? "").toLowerCase().includes(query) ||
          (o.email ?? "").toLowerCase().includes(query),
      )
    : operators;

  const toggle = (userId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      work_order_site_id: woSiteId,
      user_ids: [...selected],
    });
  };

  return (
    <div className='rounded-xl border bg-white p-4'>
      <div className='flex items-center justify-between gap-2 mb-2'>
        <div className='flex items-center gap-2'>
          <Users className='w-3.5 h-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Site operators
          </span>
          <Badge
            variant='outline'
            className='text-[10px]'>
            {selected.size} assigned
          </Badge>
        </div>
        <CustomButton
          type='button'
          variant='primary'
          Icon={Save}
          text={saveMutation.isPending ? "Saving..." : "Save"}
          onClick={handleSave}
          disabled={!dirty || saveMutation.isPending}
          loading={saveMutation.isPending}
          className='h-8 text-xs px-3'
          disableForViewer
        />
      </div>

      <p className='text-[11px] text-muted-foreground mb-3'>
        Only the operators assigned here can upload documents to this work
        order site.
      </p>

      {operators.length > 5 && (
        <Input
          mode='standalone'
          placeholder='Search operators...'
          value={search}
          onChange={(value) => setSearch(value)}
          inputIcon={Search}
          className='max-w-md mb-3'
        />
      )}

      {isLoading ? (
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='h-10 rounded-md bg-muted/60 animate-pulse'
            />
          ))}
        </div>
      ) : operators.length === 0 ? (
        <div className='rounded-lg border bg-muted/30 p-4 text-center'>
          <p className='text-xs font-medium text-foreground'>
            No site operators exist yet
          </p>
          <p className='text-[11px] text-muted-foreground mt-1'>
            Create users with the Site Operator role first, then assign them
            here.
          </p>
        </div>
      ) : (
        <ScrollArea className={cn(filtered.length > 6 ? "h-56" : "")}>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 pr-2'>
            {filtered.map((o) => {
              const checked = selected.has(o.user_id);
              return (
                <label
                  key={o.user_id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border bg-white p-2.5 text-xs cursor-pointer transition-colors",
                    checked
                      ? "border-emerald-300 bg-emerald-50/40"
                      : "hover:bg-muted/30",
                  )}>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(o.user_id)}
                  />
                  <div className='min-w-0'>
                    <p className='font-medium truncate'>
                      {o.name
                        ? capitalizeEachWord(o.name)
                        : `User ${o.user_id}`}
                    </p>
                    {o.email && (
                      <p className='text-muted-foreground flex items-center gap-1 truncate'>
                        <Mail className='h-3 w-3 shrink-0' />
                        <span className='truncate'>{o.email}</span>
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className='col-span-full text-center text-xs text-muted-foreground py-4'>
                No operators match your search
              </p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default WoSiteOperatorsSection;

"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import CustomButton from "@/components/shared/btn";
import { Users, Settings2 } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { useIsManager } from "@/contexts/AuthContext";
import WoSiteOperatorsDialog from "./wo-site-operators-dialog";

type Props = {
  woSiteId: number;
};

/** Row shape returned by getWorkOrderSiteAssignedOperators. Declared locally
 * because the deep tRPC router inference widens this query's output to `any`
 * in the built type declarations. */
type AssignedOperator = {
  user_id: number;
  name: string | null;
  email: string | null;
};

/**
 * Manager-only summary of the operators pinned to a single work-order site,
 * with a button to open the paginated assignment picker. Only pinned operators
 * can upload documents to this WO-site (enforced server-side via
 * getAccessScope / assertCanAccessWorkOrderSite). The candidate pool is every
 * Site Operator (global role) — assignment is per-WO-site.
 */
const WoSiteOperatorsSection: React.FC<Props> = ({ woSiteId }) => {
  const isManager = useIsManager();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } =
    trpc.workOrderSiteQuery.getWorkOrderSiteAssignedOperators.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: isManager && woSiteId > 0, retry: false },
    );

  // Hidden for non-managers, and for managers who lack authority on this
  // office (the query 403s → isError).
  if (!isManager || isError) return null;

  const operators: AssignedOperator[] = data ?? [];

  return (
    <div className='rounded-xl border bg-white p-4'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Users className='h-3.5 w-3.5 text-emerald-500' />
          <span className='text-xs font-medium text-gray-700'>
            Site operators
          </span>
          <Badge variant='outline' className='text-[10px]'>
            {operators.length} assigned
          </Badge>
        </div>
        <CustomButton
          type='button'
          variant='outline'
          Icon={Settings2}
          text='Manage operators'
          onClick={() => setDialogOpen(true)}
          className='h-8 px-3 text-xs'
          disableForViewer
        />
      </div>

      <p className='mb-3 text-[11px] text-muted-foreground'>
        Only the operators assigned here can upload documents to this work
        order site.
      </p>

      {isLoading ? (
        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='h-7 w-28 animate-pulse rounded-full bg-muted/60'
            />
          ))}
        </div>
      ) : operators.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          No operators assigned yet. Use{" "}
          <span className='font-medium'>Manage operators</span> to assign Site
          Operators to this work order site.
        </p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {operators.map((o) => (
            <span
              key={o.user_id}
              className='inline-flex items-center gap-1.5 rounded-full border bg-emerald-50/50 px-2.5 py-1 text-xs'
              title={o.email ?? undefined}>
              <span className='font-medium'>
                {o.name ? capitalizeEachWord(o.name) : `User ${o.user_id}`}
              </span>
            </span>
          ))}
        </div>
      )}

      <WoSiteOperatorsDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        woSiteId={woSiteId}
      />
    </div>
  );
};

export default WoSiteOperatorsSection;

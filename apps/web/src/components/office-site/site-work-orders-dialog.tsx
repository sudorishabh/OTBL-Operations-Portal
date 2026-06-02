"use client";

import React from "react";
import DialogWindow from "@/components/shared/dialog-window";
import useHandleParams from "@/hooks/useHandleParams";
import { trpc } from "@/lib/trpc";
import Loading from "@/components/loading/Loading";
import { Badge } from "@/components/ui/badge";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import { Briefcase, Users } from "lucide-react";

type Operator = { user_id: number; name: string | null; email: string | null };
type WoSiteRow = {
  work_order_site_id: number;
  work_order_id: number;
  wo_code: string;
  wo_title: string;
  job_number: string;
  status: string;
  operators: Operator[];
};

const statusClasses = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
};

const SiteWorkOrdersDialog = () => {
  const { getParam, deleteParams } = useHandleParams();
  const siteWoId = getParam("siteWoId");
  const siteWoName = getParam("siteWoName");
  const siteId = siteWoId ? Number(siteWoId) : 0;
  const isOpen = siteId > 0;

  const { data, isLoading } =
    trpc.workOrderSiteQuery.getWorkOrderSitesBySite.useQuery(
      { site_id: siteId },
      { enabled: isOpen },
    );

  const rows: WoSiteRow[] = (data as WoSiteRow[]) ?? [];

  const handleClose = () => deleteParams(["siteWoId", "siteWoName"]);

  return (
    <DialogWindow
      open={isOpen}
      setOpen={handleClose}
      title='Work Orders & Operators'
      description={
        siteWoName
          ? `${capitalizeEachWord(siteWoName)} — work orders this site appears in`
          : undefined
      }
      size='lg'
      heightMode='full'>
      {isLoading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className='text-center py-12 text-sm text-muted-foreground'>
          This site isn&apos;t part of any work order yet.
        </div>
      ) : (
        <div className='space-y-3 py-1'>
          {rows.map((row) => (
            <div
              key={row.work_order_site_id}
              className='rounded-xl border border-slate-200 bg-white p-3 sm:p-4'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Briefcase className='h-3.5 w-3.5 shrink-0 text-emerald-600' />
                    <span className='text-sm font-semibold text-slate-800 break-words'>
                      {row.wo_code}
                    </span>
                    <span className='text-xs text-slate-500 break-words'>
                      {capitalFirstLetter(row.wo_title)}
                    </span>
                  </div>
                  {row.job_number ? (
                    <p className='mt-0.5 text-[11px] text-slate-400'>
                      Job no. {row.job_number}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(
                    row.status,
                  )}`}>
                  {row.status}
                </span>
              </div>

              <div className='mt-3 border-t border-slate-100 pt-2.5'>
                <div className='mb-1.5 flex items-center gap-1.5'>
                  <Users className='h-3 w-3 text-slate-400' />
                  <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-400'>
                    Operators ({row.operators.length})
                  </span>
                </div>
                {row.operators.length > 0 ? (
                  <div className='flex flex-wrap gap-1.5'>
                    {row.operators.map((op) => (
                      <Badge
                        key={op.user_id}
                        variant='outline'
                        className='bg-orange-800/10 text-orange-900 text-[11px]'>
                        {capitalizeEachWord(op.name ?? `User ${op.user_id}`)}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className='text-[11px] text-slate-400 italic'>
                    No operators assigned
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DialogWindow>
  );
};

export default SiteWorkOrdersDialog;

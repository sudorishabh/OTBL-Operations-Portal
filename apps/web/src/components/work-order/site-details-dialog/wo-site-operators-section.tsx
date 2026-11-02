"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import CustomButton from "@/components/shared/btn";
import { Users, Settings2 } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { useIsManager } from "@/contexts/AuthContext";
import WoSiteOperatorsDialog from "./wo-site-operators-dialog";

type Props = {
  woSiteId: number;
  // What the operators work on, as named in the copy.
  subject?: string;
  // "inline" drops the section's own box, for use inside another panel.
  variant?: "panel" | "inline";
  className?: string;
};

const STYLES = {
  panel: {
    root: "relative overflow-hidden rounded-xl border border-emerald-500 bg-emerald-50/40 p-4 shadow-sm ring-1 ring-emerald-100",
    icon: "h-3.5 w-3.5 text-emerald-600",
    title: "text-xs font-semibold text-emerald-800",
    count:
      "inline-flex items-center whitespace-nowrap rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-medium text-emerald-700",
    button:
      "h-8 border-emerald-300 bg-white px-3 text-xs text-emerald-700 hover:bg-emerald-50",
    note: "mb-3 text-[11px] text-muted-foreground",
    chip: "rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs text-emerald-900 shadow-sm",
  },
  inline: {
    root: "",
    icon: "size-3.5 text-gray-400",
    title: "text-xs font-medium text-gray-700",
    count: "text-[11px] tabular-nums text-gray-400",
    button: "h-7 px-2.5 text-xs",
    note: "mb-2.5 text-[11px] text-gray-400",
    chip: "rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-700 ring-1 ring-inset ring-gray-200",
  },
} as const;

type AssignedOperator = {
  user_id: number;
  name: string | null;
  email: string | null;
};

const WoSiteOperatorsSection: React.FC<Props> = ({
  woSiteId,
  subject = "work order site",
  variant = "panel",
  className,
}) => {
  const isManager = useIsManager();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } =
    trpc.workOrderSiteQuery.getWorkOrderSiteAssignedOperators.useQuery(
      { work_order_site_id: woSiteId },
      { enabled: isManager && woSiteId > 0, retry: false },
    );

  if (!isManager || isError) return null;

  const operators: AssignedOperator[] = data ?? [];
  const styles = STYLES[variant];

  return (
    <div className={cn(styles.root, className)}>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Users className={styles.icon} />
          <span className={styles.title}>Site operators</span>
          <span className={styles.count}>{operators.length} assigned</span>
        </div>
        <CustomButton
          type='button'
          variant='outline'
          Icon={Settings2}
          text='Manage operators'
          onClick={() => setDialogOpen(true)}
          className={styles.button}
          disableForViewer
        />
      </div>

      <p className={styles.note}>
        Only the operators assigned here can upload documents to this{" "}
        {subject}.
      </p>

      {isLoading ? (
        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-28 animate-pulse rounded-full bg-muted/60",
                variant === "panel" ? "h-7" : "h-6",
              )}
            />
          ))}
        </div>
      ) : operators.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          No operators assigned yet. Use{" "}
          <span className='font-medium'>Manage operators</span> to assign Site
          Operators to this {subject}.
        </p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {operators.map((o) => (
            <span
              key={o.user_id}
              className={cn("inline-flex items-center gap-1.5", styles.chip)}
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

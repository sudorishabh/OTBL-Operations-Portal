"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import CustomButton from "@/components/shared/btn";
import { Users, Settings2 } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { useIsManager } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import WoSiteOperatorsDialog from "./wo-site-operators-dialog";

type Props = {
  woSiteId: number;
  // What the operators work on, as named in the copy.
  subject?: string;
  className?: string;
};

type AssignedOperator = {
  user_id: number;
  name: string | null;
  email: string | null;
};

const WoSiteOperatorsSection: React.FC<Props> = ({
  woSiteId,
  subject = "work order site",
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

  // One line, unboxed, inside the site's or restoration's information
  // panel: who's assigned beside the title, the action on the right.
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2",
        className,
      )}>
      <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5'>
        <span
          className='inline-flex shrink-0 items-center gap-2'
          title={`Only the operators assigned here can upload documents to this ${subject}.`}>
          <Users className='size-3.5 text-gray-400' />
          <span className='text-xs font-medium text-gray-700'>
            Site operators
          </span>
        </span>

        {isLoading ? (
          <span className='h-5 w-40 animate-pulse rounded-full bg-muted/60' />
        ) : operators.length === 0 ? (
          <span className='text-xs text-gray-400'>
            None assigned yet. Only assigned operators can upload documents to
            this {subject}.
          </span>
        ) : (
          <div className='flex min-w-0 flex-wrap gap-1.5'>
            {operators.map((o) => (
              <span
                key={o.user_id}
                className='inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-200'
                title={o.email ?? undefined}>
                {o.name ? capitalizeEachWord(o.name) : `User ${o.user_id}`}
              </span>
            ))}
          </div>
        )}
      </div>

      <CustomButton
        type='button'
        variant='outline'
        Icon={Settings2}
        text={operators.length === 0 ? "Assign operators" : "Manage"}
        onClick={() => setDialogOpen(true)}
        className='h-7 px-2.5 text-xs'
        disableForViewer
      />

      <WoSiteOperatorsDialog
        open={dialogOpen}
        setOpen={setDialogOpen}
        woSiteId={woSiteId}
      />
    </div>
  );
};

export default WoSiteOperatorsSection;

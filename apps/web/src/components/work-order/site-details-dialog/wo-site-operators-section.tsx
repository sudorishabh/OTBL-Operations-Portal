"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import CustomButton from "@/components/shared/btn";
import { Settings2 } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { useIsManager } from "@/contexts/AuthContext";
import InfoSection from "./info-section";
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

  // A row of the site's or restoration's information card.
  return (
    <InfoSection
      title='Site operators'
      description={`Only they can upload documents to this ${subject}.`}
      actions={
        <CustomButton
          type='button'
          variant='outline'
          Icon={Settings2}
          text='Manage operators'
          onClick={() => setDialogOpen(true)}
          className='h-7 px-2.5 text-xs'
          disableForViewer
        />
      }
      className={className}>
      {isLoading ? (
        <div className='flex flex-wrap gap-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='h-6 w-28 animate-pulse rounded-full bg-muted/60'
            />
          ))}
        </div>
      ) : operators.length === 0 ? (
        <p className='text-xs text-gray-400'>No operators assigned yet.</p>
      ) : (
        <div className='flex flex-wrap gap-2'>
          {operators.map((o) => (
            <span
              key={o.user_id}
              className='inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-700 ring-1 ring-inset ring-gray-200'
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
    </InfoSection>
  );
};

export default WoSiteOperatorsSection;

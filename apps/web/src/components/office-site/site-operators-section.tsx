"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { capitalizeEachWord } from "@pkg/utils";
import toast from "react-hot-toast";
import { useApiError } from "@/hooks/useApiError";

type SiteUserRow = {
  user_id?: number | null;
  email?: string | null;
};

/** Office operator as returned by getOfficeUsers.operators. Declared locally
 * because the deep tRPC router inference can widen this query's output. */
type OfficeOperator = {
  id: number;
  name: string | null;
  email: string | null;
};

type Props = {
  officeId: number;
  siteId: number;
  siteUsers: SiteUserRow[];
};

const SiteOperatorsSection: React.FC<Props> = ({
  officeId,
  siteId,
  siteUsers,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const assignMutation = trpc.siteMutation.assignUserToSite.useMutation({
    onSuccess: async () => {
      toast.success("Site operator assigned");
      await utils.siteQuery.getSitesByOfficeId.invalidate();
      await utils.siteQuery.get6SitesByOfficeId.invalidate();
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  // Only this site's office operators are assignable — not every operator in
  // the system.
  const { data: officeUsers, isLoading } =
    trpc.officeQuery.getOfficeUsers.useQuery(
      { office_id: officeId },
      { enabled: open && officeId > 0 },
    );

  const allOperators = (officeUsers?.operators ?? []) as OfficeOperator[];
  const q = search.trim().toLowerCase();
  const operators = q
    ? allOperators.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q),
      )
    : allOperators;

  const assignedIds = new Set(
    siteUsers
      .map((u) => u.user_id)
      .filter((id): id is number => typeof id === "number"),
  );

  return (
    <div className='mt-3'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#035864] transition-colors'>
        {open ? (
          <ChevronUp className='h-4 w-4' />
        ) : (
          <ChevronDown className='h-4 w-4' />
        )}
        Assign or add site operators
      </button>

      {open && (
        <div className='mt-3 rounded-lg border bg-slate-50/80 p-3 space-y-3'>
          <Input
            mode='standalone'
            placeholder='Search operators...'
            value={search}
            onChange={(value) => setSearch(value)}
            inputIcon={Search}
            className='max-w-md'
          />
          <ScrollArea className='h-48 pr-2'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {operators.map((user) => {
                const onSite = assignedIds.has(user.id);
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md border bg-white p-2.5 text-xs",
                      onSite && "opacity-60",
                    )}>
                    <div className='flex items-center gap-2 min-w-0'>
                      <div className='h-8 w-8 shrink-0 rounded-full bg-[#035864]/10 text-[#035864] flex items-center justify-center font-semibold'>
                        {String(user.name ?? "?")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className='min-w-0'>
                        <p className='font-medium truncate'>
                          {capitalizeEachWord(user.name ?? "Unknown")}
                        </p>
                        <p className='text-muted-foreground flex items-center gap-1 truncate'>
                          <Mail className='h-3 w-3 shrink-0' />
                          <span className='truncate'>{user.email}</span>
                        </p>
                      </div>
                    </div>
                    <CustomButton
                      type='button'
                      text={onSite ? "On site" : "Add"}
                      variant='outline'
                      className='h-7 text-[10px] px-2 shrink-0'
                      disabled={onSite || assignMutation.isPending}
                      disableForViewer
                      onClick={() =>
                        assignMutation.mutate({
                          site_id: siteId,
                          user_id: user.id,
                        })
                      }
                    />
                  </div>
                );
              })}
              {!isLoading && allOperators.length === 0 && (
                <p className='col-span-full text-center text-xs text-muted-foreground py-6'>
                  No operators in this office yet
                </p>
              )}
              {!isLoading &&
                allOperators.length > 0 &&
                operators.length === 0 && (
                  <p className='col-span-full text-center text-xs text-muted-foreground py-6'>
                    No operators match your search
                  </p>
                )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SiteOperatorsSection;

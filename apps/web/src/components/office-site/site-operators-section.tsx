"use client";

import React, { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import Input from "@/components/shared/input";
import CustomButton from "@/components/shared/btn";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { capitalizeEachWord, constants } from "@pkg/utils";
import toast from "react-hot-toast";
import { useApiError } from "@/hooks/useApiError";

const { ROLES } = constants;

type SiteUserRow = {
  user_id?: number | null;
  email?: string | null;
};

type Props = {
  siteId: number;
  siteUsers: SiteUserRow[];
};

const SiteOperatorsSection: React.FC<Props> = ({ siteId, siteUsers }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState<any[]>([]);
  const itemsPerPage = 50;

  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const assignMutation = trpc.siteMutation.assignUserToSite.useMutation({
    onSuccess: async () => {
      toast.success("Operator assigned to site");
      await utils.siteQuery.getSitesByOfficeId.invalidate();
      await utils.siteQuery.get6SitesByOfficeId.invalidate();
    },
    onError: (e: unknown) => handleError(e, { showToast: true }),
  });

  const { data: operatorsData, isLoading } =
    trpc.userQuery.getUsersByRole.useQuery(
      {
        role: ROLES.OPERATOR,
        page,
        limit: itemsPerPage,
        search,
      },
      { enabled: open },
    );

  useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [search]);

  useEffect(() => {
    if (!operatorsData?.users) return;
    if (page === 1) {
      setAccumulated(operatorsData.users);
    } else {
      setAccumulated((prev) => {
        const ids = new Set(prev.map((u: { id: number }) => u.id));
        const next = operatorsData.users.filter(
          (u: { id: number }) => !ids.has(u.id),
        );
        return [...prev, ...next];
      });
    }
  }, [operatorsData?.users, page]);

  const operators = accumulated;
  const hasMore = operatorsData?.pagination?.hasMore ?? false;

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
        Assign or add operators
      </button>

      {open && (
        <div className='mt-3 rounded-lg border bg-slate-50/80 p-3 space-y-3'>
          <Input
            mode='standalone'
            placeholder='Search operators...'
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            inputIcon={Search}
            className='max-w-md'
          />
          <ScrollArea className='h-48 pr-2'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              {operators.map((user: any) => {
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
                        {String(user.name).slice(0, 2).toUpperCase()}
                      </div>
                      <div className='min-w-0'>
                        <p className='font-medium truncate'>
                          {capitalizeEachWord(user.name)}
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
              {!isLoading && operators.length === 0 && (
                <p className='col-span-full text-center text-xs text-muted-foreground py-6'>
                  No operators match your search
                </p>
              )}
            </div>
          </ScrollArea>
          {hasMore && (
            <button
              type='button'
              onClick={() => setPage((p) => p + 1)}
              className='w-full py-2 text-xs text-slate-500 hover:text-[#035864] border border-dashed rounded-md'>
              Load more...
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SiteOperatorsSection;

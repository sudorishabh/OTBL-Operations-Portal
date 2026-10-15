"use client";
import React, { useState } from "react";
import { ChevronDown, Network, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import CustomButton from "@/components/shared/btn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsAdmin } from "@/contexts/AuthContext";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface Props {
  parentClient: { id: number; name: string };
  branchCount: number;
  // The branch cards; a main client has no page of its own.
  children: React.ReactNode;
}

const ParentClientGroup = ({ parentClient, branchCount, children }: Props) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isAdmin = useIsAdmin();
  const { setParams } = useHandleParams();
  const { handleError } = useApiError();
  const utils = trpc.useUtils();

  const deleteParentClient = trpc.clientMutation.deleteParentClient.useMutation(
    {
      onSuccess: () => {
        toast.success("Main client deleted successfully");
        utils.clientQuery.getParentClients.invalidate();
        utils.clientQuery.getClients.invalidate();
      },
      onError: (error: any) => handleError(error, { showToast: true }),
    },
  );

  const openDialog = (dialog: "create-client" | "edit-parent-client") =>
    setParams({ dialog, parentClientId: String(parentClient.id) });

  const displayName = parentClient.name.toUpperCase();

  return (
    <section className='rounded-xl border border-gray-200 bg-gray-50/70'>
      <div className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
        <button
          type='button'
          onClick={() => setIsExpanded((value) => !value)}
          aria-expanded={isExpanded}
          className='flex min-w-0 cursor-pointer items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-inset ring-gray-200'>
            <Network className='size-4' />
          </span>
          <span className='min-w-0'>
            <span
              className='block truncate text-[15px] font-semibold tracking-tight text-gray-900'
              title={displayName}>
              {displayName}
            </span>
            <span className='block text-xs text-gray-500'>
              Main client &middot; {branchCount}{" "}
              {branchCount === 1 ? "branch" : "branches"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-gray-400 transition-transform duration-200",
              !isExpanded && "-rotate-90",
            )}
          />
        </button>

        {isAdmin && (
          <div className='flex flex-wrap items-center gap-2'>
            <CustomButton
              text='Add Branch'
              Icon={Plus}
              variant='outline'
              onClick={() => openDialog("create-client")}
            />
            <CustomButton
              text='Rename'
              Icon={Pencil}
              variant='outline'
              onClick={() => openDialog("edit-parent-client")}
            />
            <CustomButton
              text='Delete'
              Icon={Trash2}
              variant='outline'
              loading={deleteParentClient.isPending}
              onClick={() => setIsConfirmingDelete(true)}
            />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className='border-t border-gray-200 px-4 py-4'>
          {branchCount > 0 ? (
            <div className='ml-1 grid grid-cols-1 gap-3 border-l-2 border-emerald-100 pl-4 sm:grid-cols-2 lg:grid-cols-1'>
              {children}
            </div>
          ) : (
            <p className='py-3 text-center text-sm text-gray-500'>
              No branches yet.
              {isAdmin && " Use Add Branch to add the first one."}
            </p>
          )}
        </div>
      )}

      <AlertDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete main client {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the grouping is removed.{" "}
              {branchCount > 0
                ? `Its ${branchCount} ${branchCount === 1 ? "branch stays" : "branches stay"} as standalone clients, with all their work orders and contacts.`
                : "It has no branches."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteParentClient.mutate({ parentClientId: parentClient.id })
              }
              className='bg-red-600 hover:bg-red-700 text-white'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default ParentClientGroup;

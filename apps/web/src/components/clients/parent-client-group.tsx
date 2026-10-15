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
import BranchRow, { type Branch } from "./branch-row";

interface Props {
  parentClient: { id: number; name: string };
  // A main client has no page of its own; only its branches open.
  branches: Branch[];
}

const IconAction = ({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) => (
  <button
    type='button'
    title={label}
    aria-label={label}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex size-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 outline-none transition-colors duration-150 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}>
    <Icon className='size-3.5' />
  </button>
);

const ParentClientGroup = ({ parentClient, branches }: Props) => {
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
  const branchCount = branches.length;

  return (
    <section className='rounded-xl border border-gray-200 bg-white shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-3'>
        <button
          type='button'
          onClick={() => setIsExpanded((value) => !value)}
          aria-expanded={isExpanded}
          className='flex min-w-0 cursor-pointer items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'>
            <Network className='size-4' />
          </span>
          <span className='min-w-0'>
            <span
              className='block truncate text-[15px] font-semibold tracking-tight text-gray-900'
              title={displayName}>
              {displayName}
            </span>
            <span className='block text-xs text-gray-500'>
              Main client with {branchCount}{" "}
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
          <div className='flex items-center gap-2'>
            <CustomButton
              text='Add Branch'
              Icon={Plus}
              variant='outline'
              onClick={() => openDialog("create-client")}
            />
            <IconAction
              label={`Rename ${displayName}`}
              icon={Pencil}
              onClick={() => openDialog("edit-parent-client")}
            />
            <IconAction
              label={`Delete ${displayName}`}
              icon={Trash2}
              onClick={() => setIsConfirmingDelete(true)}
              disabled={deleteParentClient.isPending}
              className='hover:border-red-200 hover:bg-red-50 hover:text-red-600'
            />
          </div>
        )}
      </div>

      {isExpanded &&
        (branchCount > 0 ? (
          <ul className='px-4 pb-3'>
            {branches.map((branch, index) => (
              <BranchRow
                key={branch.id}
                branch={branch}
                parentName={parentClient.name}
                isLast={index === branchCount - 1}
              />
            ))}
          </ul>
        ) : (
          <p className='pb-4 pl-16 pr-4 pt-2 text-sm text-gray-500'>
            No branches yet.
            {isAdmin && " Add the first one with Add Branch."}
          </p>
        ))}

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

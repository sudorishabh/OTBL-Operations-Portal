"use client";
import React, { useState } from "react";
import {
  ChevronDown,
  MoreVertical,
  Network,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsAdmin } from "@/contexts/AuthContext";
import useHandleParams from "@/hooks/useHandleParams";
import { useApiError } from "@/hooks/useApiError";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import BranchRow from "./branch-row";
import {
  ClientContactLines,
  ClientStatus,
  ContactsButton,
  formatClientLocation,
  LIST_SUBGRID,
  type ClientListItem,
} from "./client-list-parts";
import MainClientInfoChip, {
  type MainClientInfo,
} from "./main-client-info-chip";

interface Props {
  parentClient: MainClientInfo;
  // A main client has no page of its own; only its branches open. Its
  // details show here, and its contacts in a dialog.
  branches: ClientListItem[];
}

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
        utils.clientQuery.getClientGroups.invalidate();
        utils.clientQuery.totalClientAndContact.invalidate();
      },
      onError: (error: any) => handleError(error, { showToast: true }),
    },
  );

  const openDialog = (dialog: "create-client" | "edit-parent-client") =>
    setParams({ dialog, parentClientId: String(parentClient.id) });

  const displayName = parentClient.name.toUpperCase();
  const branchCount = branches.length;
  const contactCount = parentClient.contacts_count;
  const location = formatClientLocation(parentClient);

  return (
    <section
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        LIST_SUBGRID,
      )}>
      {/* Stacked on phones; in the list's columns on large screens. */}
      <div
        className={cn(
          "grid grid-cols-1 items-center gap-y-2 px-4 pb-1 pt-3",
          LIST_SUBGRID,
        )}>
        {/* The name is the expand/collapse button, stretched over the whole
            cell; the info chip sits above it so it stays its own control. */}
        <div className='relative flex min-w-0 items-center gap-3'>
          <span
            aria-hidden='true'
            className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100'>
            <Network className='size-4' />
          </span>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setIsExpanded((value) => !value)}
                aria-expanded={isExpanded}
                title={displayName}
                className='min-w-0 cursor-pointer truncate text-left text-[15px] font-semibold tracking-tight text-gray-900 outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-emerald-500/30'>
                {displayName}
              </button>
              <ClientStatus status={parentClient.status} />
              <MainClientInfoChip
                parentClient={parentClient}
                branchCount={branchCount}
                className='relative z-10'
              />
            </div>
            <p
              className='truncate text-xs text-gray-500'
              title={location || undefined}>
              Main client with {branchCount}{" "}
              {branchCount === 1 ? "branch" : "branches"}
              {location && ` · ${location}`}
            </p>
          </div>
          <ChevronDown
            aria-hidden='true'
            className={cn(
              "size-4 shrink-0 text-gray-400 transition-transform duration-200",
              !isExpanded && "-rotate-90",
            )}
          />
        </div>

        <ClientContactLines
          client={parentClient}
          className='pl-12 lg:pl-0'
        />

        <div className='flex flex-wrap items-center gap-2 sm:pl-12 lg:justify-end lg:pl-0'>
          <ContactsButton
            owner={{ parentClientId: parentClient.id }}
            ownerName={parentClient.name}
            count={contactCount}
            className='h-8 px-2.5'
          />
          {isAdmin && (
            <>
              <CustomButton
                text='Add Branch'
                Icon={Plus}
                variant='outline'
                onClick={() => openDialog("create-client")}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type='button'
                    title='More actions'
                    aria-label={`More actions for ${displayName}`}
                    className='flex size-8 cursor-pointer items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 outline-none transition-colors duration-150 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 data-[state=open]:bg-gray-50'>
                    <MoreVertical className='size-4' />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={() => openDialog("edit-parent-client")}>
                    <Pencil className='mr-2 size-4' />
                    Edit main client
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={deleteParentClient.isPending}
                    onClick={() => setIsConfirmingDelete(true)}
                    className='text-red-600 focus:text-red-600'>
                    <Trash2 className='mr-2 size-4' />
                    Delete main client
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {isExpanded &&
        (branchCount > 0 ? (
          <ul className={cn("px-4 pb-3", LIST_SUBGRID)}>
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
          <p className='pb-4 pl-16 pr-4 pt-2 text-sm text-gray-500 lg:col-span-full'>
            No branches yet.
            {isAdmin && " Add the first one with Add Branch."}
          </p>
        ))}

      <AlertDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete main client {displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {branchCount > 0
                ? `Its ${branchCount} ${branchCount === 1 ? "branch stays" : "branches stay"} as standalone clients, with all their work orders and contacts.`
                : "It has no branches."}{" "}
              {contactCount > 0 &&
                `Its own ${contactCount === 1 ? "contact is" : `${contactCount} contacts are`} deleted with it.`}
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

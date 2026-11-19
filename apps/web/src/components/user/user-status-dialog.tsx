"use client";
import React from "react";
import toast from "react-hot-toast";
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
import { useApiError } from "@/hooks/useApiError";
import { trpc } from "@/lib/trpc";
import { capitalizeEachWord } from "@pkg/utils";

export type StatusTarget = { id: number; name: string; status: string };

// Asks before turning a user's account off, or back on.
const UserStatusDialog = ({
  user,
  onClose,
}: {
  // The user being changed; nothing while the dialog is closed.
  user: StatusTarget | null;
  onClose: () => void;
}) => {
  const utils = trpc.useUtils();
  const { handleError } = useApiError();

  const setStatus = trpc.userMutation.setUserStatus.useMutation({
    onSuccess: (_data: unknown, variables: { status: string }) => {
      toast.success(
        variables.status === "active" ? "User reactivated" : "User deactivated",
      );
      utils.userQuery.getAllUser.invalidate();
      utils.userQuery.getUserById.invalidate();
      onClose();
    },
    onError: (error: unknown) => handleError(error, { showToast: true }),
  });

  const deactivating = user?.status === "active";
  const name = user ? capitalizeEachWord(user.name) : "";

  return (
    <AlertDialog
      open={!!user}
      onOpenChange={(open) => !open && !setStatus.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? `Deactivate ${name}?` : `Reactivate ${name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deactivating
              ? "They won't be able to sign in, and are signed out when their current session refreshes. Their offices, sites and everything they recorded stay as they are."
              : "They'll be able to sign in again with their existing password."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={setStatus.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={setStatus.isPending}
            className={
              deactivating
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }
            onClick={(event) => {
              // Stay open until the change is saved.
              event.preventDefault();
              if (!user) return;
              setStatus.mutate({
                id: user.id,
                status: deactivating ? "inactive" : "active",
              });
            }}>
            {setStatus.isPending
              ? "Saving…"
              : deactivating
                ? "Deactivate user"
                : "Reactivate user"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UserStatusDialog;

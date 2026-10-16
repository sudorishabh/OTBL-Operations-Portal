"use client";
import React from "react";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import { capitalFirstLetter } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useIsManager } from "@/contexts/AuthContext";

interface Props {
  restorationId: number;
  workOrderId: number;
  vendor: { id: number; name: string };
}

// Takes a vendor with no expenses off the restoration. Managers only.
const RemoveRestorationVendor = ({
  restorationId,
  workOrderId,
  vendor,
}: Props) => {
  const isManager = useIsManager();
  const utils = trpc.useUtils();
  const name = capitalFirstLetter(vendor.name);

  const removeMutation =
    trpc.siteContractorMutation.removeSiteContractor.useMutation({
      onSuccess: () => {
        toast.success("Vendor removed");
        utils.restorationQuery.getRestoration.invalidate({
          work_order_id: workOrderId,
        });
      },
      onError: (error: { message: string }) => toast.error(error.message),
    });

  if (!isManager) return null;

  return (
    <button
      type='button'
      title={`Remove ${name}`}
      aria-label={`Remove ${name}`}
      disabled={removeMutation.isPending}
      onClick={() =>
        removeMutation.mutate({
          work_order_site_id: restorationId,
          contractor_id: vendor.id,
        })
      }
      className='shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30'>
      {removeMutation.isPending ? (
        <Loader2 className='size-3.5 animate-spin' />
      ) : (
        <X className='size-3.5' />
      )}
    </button>
  );
};

export default RemoveRestorationVendor;

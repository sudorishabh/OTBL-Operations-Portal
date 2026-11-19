"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { constants } from "@pkg/utils";

// The overview's Pending tile asks for exactly this, so the two share one
// cached answer.
const PENDING_WORK_ORDERS = {
  page: 1,
  limit: 1,
  status: constants.WORK_ORDER_STATUS.PENDING,
  workOrderOrder: "latest",
} as const;

// A work order's status follows from its sites and job orders, which many
// screens change, so look again every few minutes rather than chase them all.
const REFRESH_EVERY_MS = 3 * 60 * 1000;

// How many work orders the user can see are still pending, once known.
export const usePendingWorkOrderCount = (): number | undefined => {
  const { user, isUserLoading } = useAuthContext();

  const { data } = trpc.workOrderQuery.getAll.useQuery(PENDING_WORK_ORDERS, {
    enabled: !isUserLoading && !!user,
    refetchInterval: REFRESH_EVERY_MS,
  });

  return data?.pagination.total;
};

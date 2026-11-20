"use client";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";

// The overview's figures, each asked for once the signed-in user is known.
// Cards that need the same figures share one cached answer.

const useUserKnown = () => !useAuthContext().isUserLoading;

export const useWorkOrderSummary = () =>
  trpc.dashboardQuery.getWorkOrderSummary.useQuery(undefined, {
    enabled: useUserKnown(),
  });

export const useFinanceSummary = () =>
  trpc.dashboardQuery.getFinanceSummary.useQuery(undefined, {
    enabled: useUserKnown(),
  });

export const useAttention = () =>
  trpc.dashboardQuery.getAttention.useQuery(undefined, {
    enabled: useUserKnown(),
  });

export const useModuleCounts = () =>
  trpc.dashboardQuery.getModuleCounts.useQuery(undefined, {
    enabled: useUserKnown(),
  });

export const useOfficeBreakdown = () =>
  trpc.dashboardQuery.getOfficeBreakdown.useQuery(undefined, {
    enabled: useUserKnown(),
  });

export const useClientTotals = () =>
  trpc.clientQuery.totalClientAndContact.useQuery(undefined, {
    enabled: useUserKnown(),
  });

export const useOfficeTotals = () =>
  trpc.officeQuery.getOfficeTotals.useQuery(undefined, {
    enabled: useUserKnown(),
  });

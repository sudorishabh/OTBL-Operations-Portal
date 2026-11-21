"use client";
import type { UseQueryResult } from "@tanstack/react-query";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc, type RouterOutputs } from "@/lib/trpc";

// The overview's figures, each asked for once the signed-in user is known.
// Cards that need the same figures share one cached answer.

type Dashboard = RouterOutputs["dashboardQuery"];

// `trpc` is untyped in the web app, so each hook names what it returns.
const typed = <T>(query: unknown) => query as UseQueryResult<T>;

const useUserKnown = () => !useAuthContext().isUserLoading;

export const useWorkOrderSummary = () =>
  typed<Dashboard["getWorkOrderSummary"]>(
    trpc.dashboardQuery.getWorkOrderSummary.useQuery(undefined, {
      enabled: useUserKnown(),
    }),
  );

export const useFinanceSummary = () =>
  typed<Dashboard["getFinanceSummary"]>(
    trpc.dashboardQuery.getFinanceSummary.useQuery(undefined, {
      enabled: useUserKnown(),
    }),
  );

export const useAttention = () =>
  typed<Dashboard["getAttention"]>(
    trpc.dashboardQuery.getAttention.useQuery(undefined, {
      enabled: useUserKnown(),
    }),
  );

export const useModuleCounts = () =>
  typed<Dashboard["getModuleCounts"]>(
    trpc.dashboardQuery.getModuleCounts.useQuery(undefined, {
      enabled: useUserKnown(),
    }),
  );

export const useOfficeBreakdown = () =>
  typed<Dashboard["getOfficeBreakdown"]>(
    trpc.dashboardQuery.getOfficeBreakdown.useQuery(undefined, {
      enabled: useUserKnown(),
    }),
  );

export const useClientTotals = () =>
  typed<RouterOutputs["clientQuery"]["totalClientAndContact"]>(
    trpc.clientQuery.totalClientAndContact.useQuery(undefined, {
      enabled: useUserKnown(),
    }),
  );

export const useOfficeTotals = () =>
  typed<RouterOutputs["officeQuery"]["getOfficeTotals"]>(
    trpc.officeQuery.getOfficeTotals.useQuery(undefined, {
      enabled: useUserKnown(),
    }),
  );

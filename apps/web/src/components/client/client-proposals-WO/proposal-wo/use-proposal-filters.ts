import { useCallback, useMemo, useState } from "react";
import { type proposalTypes } from "@pkg/schema";
import { statusOf } from "@/lib/wo-site-display";
import { type ProposalStatus } from "./proposal-wo-display";

type Row = proposalTypes.getProposalsByClientReturnType;

// Rows are grouped by their work order: none yet, or its status.
export const WORK_ORDER_FILTERS = [
  { value: "all", label: "All" },
  { value: "none", label: "No work order" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export type WorkOrderFilter = (typeof WORK_ORDER_FILTERS)[number]["value"];

export interface ProposalFilters {
  search: string;
  workOrder: WorkOrderFilter;
  proposalStatus: ProposalStatus | "all";
  // A work order process, or "all".
  process: string;
}

const DEFAULT_FILTERS: ProposalFilters = {
  search: "",
  workOrder: "all",
  proposalStatus: "all",
  process: "all",
};

const workOrderGroup = (row: Row): Exclude<WorkOrderFilter, "all"> =>
  row.workOrder ? statusOf(row.workOrder.status) : "none";

// Codes and titles of both the proposal and its work order.
const matchesSearch = (row: Row, query: string) =>
  !query ||
  [
    row.proposal.code,
    row.proposal.title,
    row.workOrder?.code,
    row.workOrder?.title,
  ].some((value) => value?.toLowerCase().includes(query));

export const useProposalFilters = (rows: Row[]) => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const query = filters.search.trim().toLowerCase();

  // Every filter but the work order one, so each tab counts what it'd list.
  const { proposalStatus, process: processType } = filters;
  const narrowed = useMemo(
    () =>
      rows.filter(
        (row) =>
          matchesSearch(row, query) &&
          (proposalStatus === "all" ||
            row.proposal.status === proposalStatus) &&
          // Only a work order has a process.
          (processType === "all" ||
            row.workOrder?.process_type === processType),
      ),
    [rows, query, proposalStatus, processType],
  );

  const counts = useMemo(() => {
    const totals: Record<WorkOrderFilter, number> = {
      all: narrowed.length,
      none: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of narrowed) totals[workOrderGroup(row)] += 1;
    return totals;
  }, [narrowed]);

  const visible = useMemo(
    () =>
      filters.workOrder === "all"
        ? narrowed
        : narrowed.filter((row) => workOrderGroup(row) === filters.workOrder),
    [narrowed, filters.workOrder],
  );

  const setFilter = useCallback(
    <K extends keyof ProposalFilters>(key: K, value: ProposalFilters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const isFiltered =
    query !== "" ||
    filters.workOrder !== "all" ||
    proposalStatus !== "all" ||
    processType !== "all";

  return { filters, setFilter, reset, isFiltered, visible, counts };
};

import { useCallback, useMemo, useState } from "react";
import { type workOrderTypes } from "@pkg/schema";
import { useDebounce } from "@/hooks/useDebounce";
import { type ProposalStatus } from "./proposal-wo-display";

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
  process: workOrderTypes.workOrderType["process_type"] | "all";
  // Submission date range as YYYY-MM-DD, both ends included.
  submittedFrom?: string;
  submittedTo?: string;
}

const DEFAULT_FILTERS: ProposalFilters = {
  search: "",
  workOrder: "all",
  proposalStatus: "all",
  process: "all",
};

// The filters as typed, and as sent to the server: search waits for
// typing to pause.
export const useProposalFilters = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const search = useDebounce(filters.search.trim(), 300);
  const {
    workOrder,
    proposalStatus,
    process: processType,
    submittedFrom,
    submittedTo,
  } = filters;

  const query = useMemo(
    () => ({
      search: search || undefined,
      workOrder,
      proposalStatus,
      process: processType,
      submittedFrom,
      submittedTo,
    }),
    [
      search,
      workOrder,
      proposalStatus,
      processType,
      submittedFrom,
      submittedTo,
    ],
  );

  const setFilter = useCallback(
    <K extends keyof ProposalFilters>(key: K, value: ProposalFilters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const isFiltered =
    filters.search.trim() !== "" ||
    workOrder !== "all" ||
    proposalStatus !== "all" ||
    processType !== "all" ||
    !!submittedFrom ||
    !!submittedTo;

  return { filters, query, setFilter, reset, isFiltered };
};

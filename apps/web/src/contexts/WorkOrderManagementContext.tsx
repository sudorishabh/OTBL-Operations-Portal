"use client";
import React, { createContext, useContext, useState } from "react";

export type WorkOrderSort =
  | "asc"
  | "desc"
  | "latest"
  | "oldest"
  | "ending_soonest";

export type WorkOrderProcess =
  | "bioremediation"
  | "restoration"
  | "bioremediation_restoration";

export type WorkOrderFilters = {
  status: string;
  office_id: number | undefined;
  client_id: number | undefined;
  process_type: WorkOrderProcess | undefined;
};

type WorkOrderManagementContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: WorkOrderFilters;
  setFilters: (filters: WorkOrderFilters) => void;
  resetFilters: () => void;
  workOrderOrder: WorkOrderSort;
  setWorkOrderOrder: (order: WorkOrderSort) => void;
};

const defaultFilters: WorkOrderFilters = {
  status: "all",
  office_id: undefined,
  client_id: undefined,
  process_type: undefined,
};

const WorkOrderManagementContext = createContext<
  WorkOrderManagementContextType | undefined
>(undefined);

export const WorkOrderManagementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<WorkOrderFilters>(defaultFilters);
  const [workOrderOrder, setWorkOrderOrder] = useState<WorkOrderSort>("latest");

  // Clearing the filters keeps the chosen order.
  const resetFilters = () => {
    setSearchQuery("");
    setFilters(defaultFilters);
  };

  return (
    <WorkOrderManagementContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        resetFilters,
        workOrderOrder,
        setWorkOrderOrder,
      }}>
      {children}
    </WorkOrderManagementContext.Provider>
  );
};

export const useWorkOrderManagementContext = () => {
  const context = useContext(WorkOrderManagementContext);
  if (!context) {
    throw new Error(
      "useWorkOrderManagementContext must be used within a WorkOrderManagementProvider",
    );
  }
  return context;
};

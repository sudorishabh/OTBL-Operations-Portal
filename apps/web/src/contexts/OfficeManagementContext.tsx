"use client";
import React, { createContext, useContext, useState } from "react";

export type OfficeSort = "asc" | "desc" | "latest" | "oldest";

export type OfficeFilters = {
  status: "active" | "inactive" | "all";
  /** "all" or a state name. */
  state: string;
  /** Which sites each office card lists. */
  siteStatus: "active" | "inactive" | "all";
};

type OfficeManagementContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: OfficeFilters;
  setFilters: (filters: OfficeFilters) => void;
  resetFilters: () => void;
  officeNamesOrder: OfficeSort;
  setOfficeNamesOrder: (order: OfficeSort) => void;
};

const defaultFilters: OfficeFilters = {
  status: "all",
  state: "all",
  siteStatus: "all",
};

const OfficeManagementContext = createContext<
  OfficeManagementContextType | undefined
>(undefined);

export const OfficeManagementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<OfficeFilters>(defaultFilters);
  const [officeNamesOrder, setOfficeNamesOrder] = useState<OfficeSort>("asc");

  // Clearing the filters keeps the chosen order.
  const resetFilters = () => {
    setSearchQuery("");
    setFilters(defaultFilters);
  };

  return (
    <OfficeManagementContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        resetFilters,
        officeNamesOrder,
        setOfficeNamesOrder,
      }}>
      {children}
    </OfficeManagementContext.Provider>
  );
};

export const useOfficeManagementContext = () => {
  const context = useContext(OfficeManagementContext);
  if (!context) {
    throw new Error(
      "useOfficeManagementContext must be used within a OfficeManagementProvider",
    );
  }
  return context;
};

"use client";
import React, { createContext, useContext, useState } from "react";

export type ClientSort = "name_asc" | "name_desc" | "newest" | "oldest";

export type ClientFilters = {
  status: "active" | "inactive" | "all";
  /** "all", "none" for clients without a main client, or a main client's id. */
  parentClientId: string;
  /** "all" or a state name. */
  state: string;
  sort: ClientSort;
};

type ClientManagementContextType = {
  clientSearchQuery: string;
  setClientSearchQuery: (query: string) => void;
  clientFilters: ClientFilters;
  setClientFilters: (filters: ClientFilters) => void;
  resetClientFilters: () => void;
};

const defaultClientFilters: ClientFilters = {
  status: "all",
  parentClientId: "all",
  state: "all",
  sort: "name_asc",
};

const ClientManagementContext = createContext<
  ClientManagementContextType | undefined
>(undefined);

export const ClientManagementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientFilters, setClientFilters] =
    useState<ClientFilters>(defaultClientFilters);

  // Clearing the filters keeps the chosen order.
  const resetClientFilters = () => {
    setClientSearchQuery("");
    setClientFilters({ ...defaultClientFilters, sort: clientFilters.sort });
  };

  return (
    <ClientManagementContext.Provider
      value={{
        clientSearchQuery,
        setClientSearchQuery,
        clientFilters,
        setClientFilters,
        resetClientFilters,
      }}>
      {children}
    </ClientManagementContext.Provider>
  );
};

export const useClientManagementContext = () => {
  const context = useContext(ClientManagementContext);
  if (!context) {
    throw new Error(
      "useClientManagementContext must be used within a ClientManagementProvider",
    );
  }
  return context;
};

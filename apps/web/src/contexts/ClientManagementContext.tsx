"use client";
import React, { createContext, useContext, useState } from "react";

export type ClientSort = "name_asc" | "name_desc" | "newest" | "oldest";
export type ContactSort = "newest" | "oldest" | "name_asc" | "name_desc";

export type ClientFilters = {
  status: "active" | "inactive" | "all";
  /** "all", "none" for clients without a main client, or a main client's id. */
  parentClientId: string;
  /** "all" or a state name. */
  state: string;
  sort: ClientSort;
};

export type ContactFilters = {
  /** "all" or a client's id. */
  clientId: string;
  sort: ContactSort;
};

type ClientManagementContextType = {
  clientSearchQuery: string;
  setClientSearchQuery: (query: string) => void;
  clientFilters: ClientFilters;
  setClientFilters: (filters: ClientFilters) => void;
  contactSearchQuery: string;
  setContactSearchQuery: (query: string) => void;
  contactFilters: ContactFilters;
  setContactFilters: (filters: ContactFilters) => void;
  resetClientFilters: () => void;
  resetContactFilters: () => void;
};

const defaultClientFilters: ClientFilters = {
  status: "all",
  parentClientId: "all",
  state: "all",
  sort: "name_asc",
};

const defaultContactFilters: ContactFilters = {
  clientId: "all",
  sort: "newest",
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

  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const [contactFilters, setContactFilters] = useState<ContactFilters>(
    defaultContactFilters,
  );

  // Clearing the filters keeps the chosen order.
  const resetClientFilters = () => {
    setClientSearchQuery("");
    setClientFilters({ ...defaultClientFilters, sort: clientFilters.sort });
  };

  const resetContactFilters = () => {
    setContactSearchQuery("");
    setContactFilters({ ...defaultContactFilters, sort: contactFilters.sort });
  };

  return (
    <ClientManagementContext.Provider
      value={{
        clientSearchQuery,
        setClientSearchQuery,
        clientFilters,
        setClientFilters,
        contactSearchQuery,
        setContactSearchQuery,
        contactFilters,
        setContactFilters,
        resetClientFilters,
        resetContactFilters,
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

"use client";
import React, { createContext, useContext, useState } from "react";

export type UserRoleFilter =
  | "all"
  | "office_manager"
  | "office_operator"
  | "site_operator"
  | "viewer";

export type UserSort = "asc" | "desc" | "latest" | "oldest";

export type UserFilters = {
  role: UserRoleFilter;
  status: "all" | "active" | "inactive";
  /** "all" or an office's id. */
  officeId: string;
  assignment: "all" | "assigned" | "unassigned";
};

export const defaultUserFilters: UserFilters = {
  role: "all",
  status: "all",
  officeId: "all",
  assignment: "all",
};

type UserManagementContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: UserFilters;
  setFilters: (filters: UserFilters) => void;
  resetFilters: () => void;
  userNamesOrder: UserSort;
  setUserNamesOrder: (order: UserSort) => void;
};

const UserManagementContext = createContext<
  UserManagementContextType | undefined
>(undefined);

export const UserManagementProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<UserFilters>(defaultUserFilters);
  const [userNamesOrder, setUserNamesOrder] = useState<UserSort>("latest");

  // Clearing the filters keeps the chosen order.
  const resetFilters = () => {
    setSearchQuery("");
    setFilters(defaultUserFilters);
  };

  return (
    <UserManagementContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        resetFilters,
        userNamesOrder,
        setUserNamesOrder,
      }}>
      {children}
    </UserManagementContext.Provider>
  );
};

export const useUserManagementContext = () => {
  const context = useContext(UserManagementContext);
  if (!context) {
    throw new Error(
      "useUserManagementContext must be used within a UserManagementProvider",
    );
  }
  return context;
};

"use client";
import React, { createContext, useContext, useState } from "react";

type UserManagementContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: {
    role: "all" | "office_manager" | "office_operator" | "site_operator" | "viewer";
    status: "all" | "active" | "inactive";
  };
  setFilters: (filters: {
    role: "all" | "office_manager" | "office_operator" | "site_operator" | "viewer";
    status: "all" | "active" | "inactive";
  }) => void;
  resetFilters: () => void;
  userNamesOrder: "asc" | "desc" | "latest" | "oldest";
  setUserNamesOrder: (order: "asc" | "desc" | "latest" | "oldest") => void;
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
  const [filters, setFilters] = useState<{
    role: "all" | "office_manager" | "office_operator" | "site_operator" | "viewer";
    status: "all" | "active" | "inactive";
  }>({
    role: "all",
    status: "all",
  });
  const [userNamesOrder, setUserNamesOrder] = useState<
    "asc" | "desc" | "latest" | "oldest"
  >("latest");

  const resetFilters = () => {
    setSearchQuery("");
    setFilters({
      role: "all",
      status: "all",
    });
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
      "useUserManagementContext must be used within a UserManagementProvider"
    );
  }
  return context;
};

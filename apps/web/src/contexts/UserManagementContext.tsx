"use client";
import React, { createContext, useContext, useState } from "react";

type UserManagementContextType = {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: {
    role: "all" | "manager" | "operator" | "viewer";
    status: "all" | "active" | "inactive";
  };
  setFilters: (filters: {
    role: "all" | "manager" | "operator" | "viewer";
    status: "all" | "active" | "inactive";
  }) => void;
  resetFilters: () => void;
  userNamesOrder: "asc" | "desc" | "latest" | "oldest";
  setUserNamesOrder: (order: "asc" | "desc" | "latest" | "oldest") => void;
  // isUserTab: string;
  // setIsUserTab: (tab: string) => void;
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
    role: "all" | "manager" | "operator" | "viewer";
    status: "all" | "active" | "inactive";
  }>({
    role: "all",
    status: "all",
  });
  const [userNamesOrder, setUserNamesOrder] = useState<
    "asc" | "desc" | "latest" | "oldest"
  >("latest");
  // const [isUserTab, setIsUserTab] = useState("all");

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
        // isUserTab,
        // setIsUserTab,
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

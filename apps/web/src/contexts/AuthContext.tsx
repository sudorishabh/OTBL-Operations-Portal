"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useAuth, type User, type UseAuthReturn } from "@/hooks/use-auth";

export type { User };

type AuthContextType = UseAuthReturn;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export const useHasRole = (requiredRole: string): boolean => {
  const { user } = useAuthContext();
  if (!user) return false;

  const roleHierarchy: Record<string, number> = {
    admin: 4,
    office_manager: 3,
    office_operator: 2,
    site_operator: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
};

export const useHasAnyRole = (allowedRoles: string[]): boolean => {
  const { user } = useAuthContext();
  if (!user) return false;
  return allowedRoles.includes(user.role);
};

export const useIsAdmin = (): boolean => useHasRole("admin");

export const useIsManager = (): boolean => useHasRole("office_manager");

export const useIsViewer = (): boolean => {
  const { user } = useAuthContext();
  return user?.role === "viewer";
};

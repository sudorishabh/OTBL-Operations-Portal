"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useAuth, type User, type UseAuthReturn } from "@/hooks/use-auth";

// Re-export User type for use in other components
export type { User };

/**
 * Auth context type - extends the useAuth return type
 */
type AuthContextType = UseAuthReturn;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider component - wraps the app to provide auth state
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

/**
 * Hook to check if user has a specific role
 */
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

/**
 * Hook to check if user has any of the specified roles
 */
export const useHasAnyRole = (allowedRoles: string[]): boolean => {
  const { user } = useAuthContext();
  if (!user) return false;
  return allowedRoles.includes(user.role);
};

/**
 * Hook to check if user is admin
 */
export const useIsAdmin = (): boolean => useHasRole("admin");

/**
 * Hook to check if user is manager or higher
 */
export const useIsManager = (): boolean => useHasRole("office_manager");

/**
 * Hook to check if the current user is a viewer (read-only role).
 * Use this to disable create/edit/delete actions in the UI.
 */
export const useIsViewer = (): boolean => {
  const { user } = useAuthContext();
  return user?.role === "viewer";
};


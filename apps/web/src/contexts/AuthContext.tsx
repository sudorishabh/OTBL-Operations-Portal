"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useAuth, type User, type UseAuthReturn } from "@/hooks/use-auth";
import { can, type Permissions } from "@pkg/auth/permissions";

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

// Whether the signed-in user's role grants every one of `permissions`, by the
// same Better Auth access control the API enforces.
export const useCan = (permissions: Permissions): boolean => {
  const { user } = useAuthContext();
  return can(user?.role, permissions);
};

export const useHasAnyRole = (allowedRoles: string[]): boolean => {
  const { user } = useAuthContext();
  if (!user) return false;
  return allowedRoles.includes(user.role);
};

export const useIsAdmin = (): boolean => useCan({ portal: ["administer"] });

// Office operators run their offices' sites and orders; the API checks which
// offices.
export const useIsOfficeOperatorOrAdmin = (): boolean =>
  useHasAnyRole(["admin", "office_operator"]);

// Signed in, but only to read.
export const useIsViewer = (): boolean => {
  const { user } = useAuthContext();
  return !!user && !can(user.role, { records: ["write"] });
};

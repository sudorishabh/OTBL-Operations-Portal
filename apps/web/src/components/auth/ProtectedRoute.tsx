"use client";
import React, { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useAuthContext,
  useHasRole,
  useHasAnyRole,
} from "@/contexts/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
  /** Redirect path when unauthorized. Defaults to /login */
  redirectTo?: string;
  /** Loading component to show while checking auth */
  loadingComponent?: ReactNode;
  /** Component to show when access is forbidden (logged in but wrong role) */
  forbiddenComponent?: ReactNode;
};

/**
 * Protect a route - requires user to be logged in
 */
export const ProtectedRoute = ({
  children,
  redirectTo = "/login",
  loadingComponent = <DefaultLoading />,
}: ProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, isUserLoading } = useAuthContext();

  useEffect(() => {
    if (isUserLoading || isAuthenticated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      router.push(redirectTo);
    });
    return () => {
      cancelled = true;
    };
  }, [isUserLoading, isAuthenticated, redirectTo, router]);

  if (isUserLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

type RoleProtectedRouteProps = ProtectedRouteProps & {
  /** Minimum role required to access */
  requiredRole: string;
};

/**
 * Protect a route with role requirement
 * User must be logged in AND have at least the required role
 */
export const RoleProtectedRoute = ({
  children,
  requiredRole,
  redirectTo = "/login",
  loadingComponent = <DefaultLoading />,
  forbiddenComponent = <DefaultForbidden />,
}: RoleProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, isUserLoading } = useAuthContext();
  const hasRequiredRole = useHasRole(requiredRole);

  useEffect(() => {
    if (isUserLoading || isAuthenticated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      router.push(redirectTo);
    });
    return () => {
      cancelled = true;
    };
  }, [isUserLoading, isAuthenticated, redirectTo, router]);

  if (isUserLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasRequiredRole) {
    return <>{forbiddenComponent}</>;
  }

  return <>{children}</>;
};

type MultiRoleProtectedRouteProps = ProtectedRouteProps & {
  /** Roles that can access (user must have one of these) */
  allowedRoles: string[];
};

/**
 * Protect a route with multiple allowed roles
 * User must be logged in AND have one of the allowed roles
 */
export const MultiRoleProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = "/login",
  loadingComponent = <DefaultLoading />,
  forbiddenComponent = <DefaultForbidden />,
}: MultiRoleProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, isUserLoading } = useAuthContext();
  const hasAllowedRole = useHasAnyRole(allowedRoles);

  useEffect(() => {
    if (isUserLoading || isAuthenticated) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      router.push(redirectTo);
    });
    return () => {
      cancelled = true;
    };
  }, [isUserLoading, isAuthenticated, redirectTo, router]);

  if (isUserLoading) {
    return <>{loadingComponent}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!hasAllowedRole) {
    return <>{forbiddenComponent}</>;
  }

  return <>{children}</>;
};

/**
 * Admin-only route protection
 */
export const AdminRoute = ({
  children,
  ...props
}: Omit<RoleProtectedRouteProps, "requiredRole">) => (
  <RoleProtectedRoute
    requiredRole='admin'
    {...props}>
    {children}
  </RoleProtectedRoute>
);

/**
 * Manager or higher route protection
 */
export const ManagerRoute = ({
  children,
  ...props
}: Omit<RoleProtectedRouteProps, "requiredRole">) => (
  <RoleProtectedRoute
    requiredRole='office_manager'
    {...props}>
    {children}
  </RoleProtectedRoute>
);


// Default loading component
const DefaultLoading = () => (
  <div className='flex items-center justify-center min-h-screen'>
    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900' />
  </div>
);

// Default forbidden component
const DefaultForbidden = () => (
  <div className='flex flex-col items-center justify-center min-h-screen gap-4'>
    <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
    <p className='text-gray-600'>
      You don&apos;t have permission to access this page.
    </p>
  </div>
);

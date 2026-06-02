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
  redirectTo?: string;
  loadingComponent?: ReactNode;
  forbiddenComponent?: ReactNode;
};

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
  requiredRole: string;
};

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
  allowedRoles: string[];
};

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

const DefaultLoading = () => (
  <div className='flex items-center justify-center min-h-screen'>
    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900' />
  </div>
);

const DefaultForbidden = () => (
  <div className='flex flex-col items-center justify-center min-h-screen gap-4'>
    <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
    <p className='text-gray-600'>
      You don&apos;t have permission to access this page.
    </p>
  </div>
);

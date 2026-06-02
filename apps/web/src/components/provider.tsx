"use client";
import { useState, useRef, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  httpLink,
  httpBatchLink,
  splitLink,
  TRPCClientError,
} from "@trpc/client";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserManagementProvider } from "@/contexts/UserManagementContext";
import { WorkOrderManagementProvider } from "@/contexts/WorkOrderManagementContext";
import { OfficeManagementProvider } from "@/contexts/OfficeManagementContext";

const Provider = ({ children }: { children: React.ReactNode }) => {
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<boolean> | null>(null);

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    isRefreshing.current = true;
    refreshPromise.current = (async () => {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
        const response = await fetch(
          `${serverUrl}/trpc/authQuery.me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const result = await response.json();

        if (result?.result?.data?.success) {
          return true;
        }
        return false;
      } catch (error) {
        console.error("[Auth] Token refresh failed:", error);
        return false;
      } finally {
        isRefreshing.current = false;
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof TRPCClientError) {
                if (error.data?.code === "UNAUTHORIZED") {
                  return false;
                }
              }
              return failureCount < 3;
            },
            refetchOnWindowFocus: false,
            staleTime: 1000 * 30,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  const customFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await fetch(input, {
        ...init,
        credentials: "include",
      });

      if (response.status === 401) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          return fetch(input, {
            ...init,
            credentials: "include",
          });
        }
      }

      return response;
    },
    [attemptTokenRefresh]
  );

  const [trpcClient] = useState(() => {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "";
    return trpc.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === "mutation",
          true: httpLink({
            url: `${serverUrl}/trpc`,
            fetch: customFetch,
          }),
          false: httpBatchLink({
            url: `${serverUrl}/trpc`,
            fetch: customFetch,
          }),
        }),
      ],
    });
  });

  return (
    <trpc.Provider
      client={trpcClient}
      queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserManagementProvider>
            <WorkOrderManagementProvider>
              <OfficeManagementProvider>
                <SidebarProvider>{children}</SidebarProvider>
              </OfficeManagementProvider>
            </WorkOrderManagementProvider>
          </UserManagementProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
};

export default Provider;

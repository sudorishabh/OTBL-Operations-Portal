"use client";
import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
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

  // Sends the Better Auth session cookie with every call. The API renews the
  // session as it is used, so nothing here refreshes tokens.
  const customFetch = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, credentials: "include" }),
    [],
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
                {children}
              </OfficeManagementProvider>
            </WorkOrderManagementProvider>
          </UserManagementProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
};

export default Provider;

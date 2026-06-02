import React, { useState, useCallback, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import {
  httpLink,
  httpBatchLink,
  splitLink,
  TRPCClientError,
} from "@trpc/client";
import { TRPC_URL } from "@/lib/constants";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/secure-store";
import { AuthProvider } from "@/contexts/AuthContext";
import Toast from "react-native-toast-message";

export default function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const isRefreshing = useRef(false);
  const refreshPromise = useRef<Promise<boolean> | null>(null);

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshing.current && refreshPromise.current) {
      return refreshPromise.current;
    }

    isRefreshing.current = true;
    refreshPromise.current = (async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) return false;

        const response = await fetch(`${TRPC_URL}/authMutation.refreshToken`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          signal: controller.signal,
        });

        const result = await response.json();

        if (result?.result?.data?.success) {
          await setTokens(
            result.result.data.accessToken,
            result.result.data.refreshToken,
          );
          return true;
        }

        await clearTokens();
        return false;
      } catch (error) {
        console.error("[Auth] Token refresh failed:", error);
        return false;
      } finally {
        clearTimeout(timeoutId);
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
      }),
  );

  const customFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const accessToken = await getAccessToken();

      const headers: Record<string, string> = {
        ...(init?.headers as Record<string, string>),
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const response = await fetch(input, {
        ...init,
        headers,
      });

      if (response.status === 401) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          const newToken = await getAccessToken();
          const retryHeaders: Record<string, string> = {
            ...(init?.headers as Record<string, string>),
          };
          if (newToken) {
            retryHeaders["Authorization"] = `Bearer ${newToken}`;
          }

          return fetch(input, {
            ...init,
            headers: retryHeaders,
          });
        }
      }

      return response;
    },
    [attemptTokenRefresh],
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === "mutation",
          true: httpLink({
            url: TRPC_URL,
            fetch: customFetch as typeof globalThis.fetch,
          }),
          false: httpBatchLink({
            url: TRPC_URL,
            fetch: customFetch as typeof globalThis.fetch,
          }),
        }),
      ],
    }),
  );

  return (
    <trpc.Provider
      client={trpcClient}
      queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toast />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

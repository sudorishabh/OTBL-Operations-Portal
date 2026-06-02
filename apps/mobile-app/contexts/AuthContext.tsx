import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/secure-store";
import { TRPC_URL } from "@/lib/constants";

/**
 * User type matching the server response
 */
export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

/**
 * Auth context state
 */
type AuthContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth provider — manages authentication state for the mobile app
 *
 * Key differences from web:
 * - Uses expo-secure-store instead of httpOnly cookies
 * - Sends tokens via Authorization header
 * - Login mutation extracts tokens from response body
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Refresh the user session using stored tokens
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log("[Auth] Starting session refresh check...");
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();

      if (!accessToken && !refreshToken) {
        console.log("[Auth] No tokens found, bypassing refresh.");
        setUser(null);
        return false;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        if (!accessToken) {
          console.log("[Auth] Access token missing, trying refresh token...");
          // Use the refreshToken mutation endpoint
          const response = await fetch(
            `${TRPC_URL}/authMutation.refreshToken`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
              signal: controller.signal,
            },
          );

          const result = await response.json();

          if (result?.result?.data?.success) {
            console.log("[Auth] Token refresh successful.");
            await setTokens(
              result.result.data.accessToken,
              result.result.data.refreshToken,
            );
            setUser(result.result.data.user);
            return true;
          }

          console.log("[Auth] Token refresh failed response.");
          await clearTokens();
          setUser(null);
          return false;
        }

        console.log("[Auth] Access token found, checking validity...");
        // We have an access token — fetch user info
        const response = await fetch(`${TRPC_URL}/authQuery.me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        const result = await response.json();

        if (result?.result?.data?.success && result.result.data.user) {
          console.log(
            "[Auth] Session valid, user:",
            result.result.data.user.name,
          );
          setUser(result.result.data.user);
          return true;
        }

        console.log("[Auth] Access token invalid, trying refresh...");
        // Access token invalid — try refresh
        if (!refreshToken) {
          await clearTokens();
          setUser(null);
          return false;
        }

        const refreshResponse = await fetch(
          `${TRPC_URL}/authMutation.refreshToken`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
            signal: controller.signal,
          },
        );

        const refreshResult = await refreshResponse.json();

        if (refreshResult?.result?.data?.success) {
          console.log(
            "[Auth] Token refresh successful after invalid access token.",
          );
          await setTokens(
            refreshResult.result.data.accessToken,
            refreshResult.result.data.refreshToken,
          );
          setUser(refreshResult.result.data.user);
          return true;
        }

        console.log("[Auth] Both tokens invalid.");
        await clearTokens();
        setUser(null);
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error(
          "[Auth] Session refresh timed out after 5s. Check API accessibility.",
        );
      } else {
        console.error("[Auth] Session refresh failed:", error);
      }
      setUser(null);
      return false;
    }
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch(`${TRPC_URL}/authMutation.login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    // Check for tRPC error shape
    if (result?.error) {
      const message =
        result.error.message ||
        result.error.data?.message ||
        "Login failed. Please try again.";
      throw new Error(message);
    }

    if (!result?.result?.data?.success) {
      throw new Error("Login failed. Please try again.");
    }

    const data = result.result.data;

    // Store tokens securely
    await setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
  }, []);

  /**
   * Logout — clear tokens and reset state
   */
  const logout = useCallback(async () => {
    try {
      const accessToken = await getAccessToken();
      // Try to call logout on server (best effort)
      await fetch(`${TRPC_URL}/authMutation.logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    } catch (error) {
      console.error("[Auth] Server logout failed:", error);
    } finally {
      await clearTokens();
      setUser(null);
    }
  }, []);

  // On mount, check for existing session
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      await refreshSession();
      setIsLoading(false);
    };
    checkAuth();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshSession,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(requiredRole: string): boolean {
  const { user } = useAuth();
  if (!user) return false;

  const roleHierarchy: Record<string, number> = {
    admin: 3,
    office_manager: 2,
    operator: 1,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useHasRole("admin");
}

/**
 * Hook to check if user is manager or higher
 */
export function useIsManager(): boolean {
  return useHasRole("office_manager");
}

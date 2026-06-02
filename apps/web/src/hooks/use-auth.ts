"use client";
import { useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

export type UseAuthReturn = {
  user: User | null;
  setUser: (user: User | null) => void;
  isUserLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refetchUser: () => void;
};

export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setUserIsLoading] = useState(true);

  const {
    data,
    isLoading: isQueryLoading,
    refetch,
  } = trpc.authQuery.me.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5,
    staleTime: 1000 * 60 * 10,
  });

  const logoutMutation = trpc.authMutation.logout.useMutation();

  useEffect(() => {
    if (!isQueryLoading) {
      if (data?.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
      setUserIsLoading(false);
    }
  }, [data, isQueryLoading]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [logoutMutation, router]);

  const refetchUser = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    user,
    setUser,
    isUserLoading: isUserLoading || isQueryLoading,
    isAuthenticated: !!user,
    logout,
    refetchUser,
  };
};

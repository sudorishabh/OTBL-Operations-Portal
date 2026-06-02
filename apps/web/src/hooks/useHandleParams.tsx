"use client";
import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const useHandleParams = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      if (searchParams.get(key) === value) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  const deleteParam = useCallback(
    (key: string) => {
      if (!searchParams.has(key)) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      const paramsString = params.toString();
      router.push(paramsString ? `?${paramsString}` : window.location.pathname);
    },
    [searchParams, router]
  );

  const setParams = useCallback(
    (paramsObject: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(paramsObject).forEach(([key, value]) => {
        params.set(key, value);
      });
      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  const deleteParams = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      keys.forEach((key) => params.delete(key));
      const paramsString = params.toString();
      router.push(paramsString ? `?${paramsString}` : window.location.pathname);
    },
    [searchParams, router]
  );

  const updateParams = useCallback(
    (set?: Record<string, string>, del?: string[]) => {
      const params = new URLSearchParams(searchParams.toString());

      if (del) {
        del.forEach((key) => params.delete(key));
      }

      if (set) {
        Object.entries(set).forEach(([key, value]) => {
          params.set(key, value);
        });
      }

      const paramsString = params.toString();
      router.push(paramsString ? `?${paramsString}` : window.location.pathname);
    },
    [searchParams, router]
  );

  const getParam = useCallback(
    (key: string) => {
      return searchParams.get(key);
    },
    [searchParams]
  );

  const clearAllParams = useCallback(() => {
    router.push(window.location.pathname);
  }, [router]);

  return {
    setParam,
    deleteParam,
    setParams,
    deleteParams,
    updateParams,
    getParam,
    clearAllParams,
  };
};

export default useHandleParams;

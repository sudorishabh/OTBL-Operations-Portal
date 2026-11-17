"use client";
import { useCallback, useState } from "react";

/**
 * The page a paginated list is on. The page belongs to one set of filters:
 * changing them (search, status, sort) goes back to page 1.
 */
export function usePageNumber(filters: unknown) {
  const filtersKey = JSON.stringify(filters);
  const [current, setCurrent] = useState({ filtersKey, page: 1 });
  const page = current.filtersKey === filtersKey ? current.page : 1;

  const setPage = useCallback(
    (next: number) => setCurrent({ filtersKey, page: Math.max(1, next) }),
    [filtersKey],
  );

  return [page, setPage] as const;
}

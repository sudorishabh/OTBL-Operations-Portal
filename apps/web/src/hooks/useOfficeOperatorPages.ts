"use client";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { constants } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoadMorePages } from "@/hooks/useLoadMorePages";

const { ROLES } = constants;

const PAGE_SIZE = 50;

export interface OfficeOperatorRow {
  id: number;
  code: string;
  name: string;
  email: string;
  contact_number: string | null;
  role: string;
}

type OperatorsPage = {
  users: OfficeOperatorRow[];
  pagination: { hasMore: boolean; total: number };
};

// Office operators to pick from, searched as typed and loaded a page at a
// time. Each page is its own query, so a refresh updates the loaded pages in
// place and a new search starts again at the first.
export function useOfficeOperatorPages(search: string, enabled = true) {
  const debouncedSearch = useDebounce(search.trim(), 300);
  const input = {
    role: ROLES.OFFICE_OPERATOR,
    limit: PAGE_SIZE,
    search: debouncedSearch,
  };
  const { pages, loadMore } = useLoadMorePages(input);

  const queries: UseQueryResult<OperatorsPage>[] = trpc.useQueries((t: any) =>
    pages.map((page) =>
      t.userQuery.getUsersByRole(
        { ...input, page },
        {
          enabled,
          placeholderData: page === 1 ? keepPreviousData : undefined,
        },
      ),
    ),
  );

  return {
    operators: queries.flatMap((query) => query.data?.users ?? []),
    hasMore: !!queries.at(-1)?.data?.pagination.hasMore,
    isLoading: !!queries[0]?.isLoading,
    isLoadingMore: pages.length > 1 && !!queries.at(-1)?.isLoading,
    loadMore,
  };
}

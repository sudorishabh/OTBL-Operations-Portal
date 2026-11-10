"use client";
import { useState } from "react";

/**
 * Tracks which pages a "Load More" list shows. The loaded pages belong to one
 * query input: changing it (search, filters, sort) starts over at page 1.
 *
 * Query each returned page separately (e.g. with `trpc.useQueries`) so that
 * invalidating the query refreshes the rows in place instead of appending a
 * page twice.
 */
export function useLoadMorePages(queryInput: unknown) {
  const queryKey = JSON.stringify(queryInput);
  const [loaded, setLoaded] = useState({ queryKey, count: 1 });
  const pageCount = loaded.queryKey === queryKey ? loaded.count : 1;

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const loadMore = () => setLoaded({ queryKey, count: pageCount + 1 });

  return { pages, loadMore };
}

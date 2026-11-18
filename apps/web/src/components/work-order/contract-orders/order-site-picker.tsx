"use client";
import React, { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { capitalFirstLetter, capitalizeEachWord } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import PagedPicker, { type PickerItem } from "@/components/shared/paged-picker";

const PAGE_SIZE = 6;

type SiteRow = { id: number; code: string; name: string; city: string };

interface Props {
  workOrderId: number;
  selected: PickerItem[];
  onChange: (selected: PickerItem[]) => void;
  className?: string;
}

// Picks the work order's bioremediation sites an order is for, a page at a
// time, searched by code, name or city.
const OrderSitePicker = ({
  workOrderId,
  selected,
  onChange,
  className,
}: Props) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const sitesQuery = trpc.contractOrderQuery.findOrderableSites.useQuery(
    {
      work_order_id: workOrderId,
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
    },
    { enabled: workOrderId > 0, placeholderData: keepPreviousData },
  );
  const items: PickerItem[] = ((sitesQuery.data?.sites ?? []) as SiteRow[]).map(
    (site) => ({
      id: site.id,
      code: site.code,
      name: capitalFirstLetter(site.name),
      hint: capitalizeEachWord(site.city),
    }),
  );

  return (
    <PagedPicker
      label='Sites'
      noun={{ one: "site", many: "sites" }}
      mode='multiple'
      selected={selected}
      onChange={onChange}
      items={items}
      isLoading={sitesQuery.isLoading}
      isFetching={sitesQuery.isFetching && !sitesQuery.isLoading}
      search={search}
      onSearchChange={(next) => {
        setSearch(next);
        setPage(1);
      }}
      page={page}
      pageSize={PAGE_SIZE}
      total={sitesQuery.data?.pagination.total ?? 0}
      onPageChange={setPage}
      emptyText='This work order has no bioremediation sites yet.'
      className={className}
    />
  );
};

export default OrderSitePicker;

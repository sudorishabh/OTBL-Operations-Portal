"use client";
import React, { useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { capitalizeEachWord } from "@pkg/utils";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import PagedPicker, { type PickerItem } from "@/components/shared/paged-picker";
import NewVendorButton from "./new-vendor-button";

const PAGE_SIZE = 6;

type VendorRow = {
  id: number;
  code: string;
  name: string;
  state: string | null;
};

interface Props {
  mode: "single" | "multiple";
  selected: PickerItem[];
  onChange: (selected: PickerItem[]) => void;
  className?: string;
}

// Picks vendors a page at a time, searched by code, name, contact, GST or
// state. A vendor added from here is chosen at once.
const VendorPicker = ({ mode, selected, onChange, className }: Props) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim(), 300);

  const vendorsQuery = trpc.contractorQuery.getVendors.useQuery(
    {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      sort: "name_asc",
    },
    { placeholderData: keepPreviousData },
  );
  const items: PickerItem[] = (
    (vendorsQuery.data?.vendors ?? []) as VendorRow[]
  ).map((vendor) => ({
    id: vendor.id,
    code: vendor.code,
    name: vendor.name,
    hint: vendor.state ? capitalizeEachWord(vendor.state) : null,
  }));

  return (
    <PagedPicker
      label={mode === "single" ? "Vendor" : "Vendors"}
      noun={{ one: "vendor", many: "vendors" }}
      mode={mode}
      selected={selected}
      onChange={onChange}
      items={items}
      isLoading={vendorsQuery.isLoading}
      isFetching={vendorsQuery.isFetching && !vendorsQuery.isLoading}
      search={search}
      onSearchChange={(next) => {
        setSearch(next);
        setPage(1);
      }}
      page={page}
      pageSize={PAGE_SIZE}
      total={vendorsQuery.data?.pagination.total ?? 0}
      onPageChange={setPage}
      emptyText='No vendors yet. Add one with New vendor.'
      action={
        <NewVendorButton
          onAdded={(vendor) => {
            const added = {
              id: vendor.id,
              code: vendor.code,
              name: vendor.name,
            };
            onChange(
              mode === "single"
                ? [added]
                : [...selected.filter((item) => item.id !== added.id), added],
            );
          }}
        />
      }
      className={className}
    />
  );
};

export default VendorPicker;

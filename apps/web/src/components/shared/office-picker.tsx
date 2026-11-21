"use client";
import React, { useState } from "react";
import { keepPreviousData, type UseQueryResult } from "@tanstack/react-query";
import { Building2, Check, MapPin, Search, X } from "lucide-react";
import { capitalizeEachWord } from "@pkg/utils";
import { Skeleton } from "@/components/ui/skeleton";
import RecordCode from "@/components/shared/record-code";
import TablePagination from "@/components/shared/table-pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc, type RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type OfficePage = RouterOutputs["officeQuery"]["getOfficePickerPage"];
type Office = OfficePage["offices"][number];

// Three rows of two, or six down a phone.
const PAGE_SIZE = 6;

const location = (office: Office) =>
  [office.city, office.state]
    .filter(Boolean)
    .map((part) => capitalizeEachWord(part!))
    .join(", ");

interface Props {
  value?: number;
  onChange: (officeId: number) => void;
  disabled?: boolean;
  // Marks the picker as needing a choice, as when the form was sent without one.
  invalid?: boolean;
}

// Picks an office from every office the user can see, a page at a time: the
// one picked on top, then a search, a page of offices as cards, and numbered
// pages to step through. The offices are never all loaded at once.
const OfficePicker = ({ value, onChange, disabled, invalid }: Props) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // The office last picked here, so it shows without asking the server.
  const [picked, setPicked] = useState<Office | null>(null);
  const debouncedSearch = useDebounce(search.trim(), 300);

  // An office set from outside, as when editing, is looked up by its id.
  const knowsPicked = !value || picked?.id === value;
  const query = trpc.officeQuery.getOfficePickerPage.useQuery(
    {
      searchQuery: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
      selectedId: knowsPicked ? undefined : value,
    },
    { placeholderData: keepPreviousData },
  ) as UseQueryResult<OfficePage>;

  const offices = query.data?.offices ?? [];
  const total = query.data?.total ?? 0;
  const selected = !value
    ? null
    : picked?.id === value
      ? picked
      : (query.data?.selected ?? null);

  const choose = (office: Office) => {
    setPicked(office);
    onChange(office.id);
  };

  return (
    <div
      className={cn(
        "@container overflow-hidden rounded-lg border bg-white",
        invalid ? "border-destructive" : "border-gray-200",
        disabled && "pointer-events-none opacity-60",
      )}>
      {/* The office picked, wherever it is in the list. */}
      <div className='flex min-h-14 items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-3 py-2.5'>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            selected
              ? "bg-emerald-100 text-emerald-700"
              : "bg-gray-200/70 text-gray-400",
          )}>
          <Building2 className='size-4.5' />
        </span>
        {selected ? (
          <div className='min-w-0 flex-1'>
            <p className='flex min-w-0 items-center gap-2'>
              <span className='truncate text-sm font-semibold text-gray-900'>
                {capitalizeEachWord(selected.name)}
              </span>
              <RecordCode code={selected.code} />
            </p>
            {location(selected) && (
              <p className='truncate text-xs text-gray-500'>
                {location(selected)}
              </p>
            )}
          </div>
        ) : (
          <p className='text-sm text-gray-500'>
            {value && query.isPending
              ? "Loading the office…"
              : "No office picked yet. Choose one below."}
          </p>
        )}
        {selected && (
          <Check className='ml-auto size-4 shrink-0 text-emerald-600' />
        )}
      </div>

      <div className='space-y-3 p-3'>
        <div className='relative'>
          <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400' />
          <input
            type='search'
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder='Search offices by code, name, city or state'
            aria-label='Search offices'
            className='h-10 w-full rounded-md border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-emerald-500 focus:ring-[3px] focus:ring-emerald-500/15'
          />
          {search && (
            <button
              type='button'
              aria-label='Clear search'
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'>
              <X className='size-3.5' />
            </button>
          )}
        </div>

        <ul
          role='radiogroup'
          aria-label='Offices'
          aria-busy={query.isFetching}
          className={cn(
            "grid min-h-[13rem] content-start gap-2 transition-opacity @md:grid-cols-2 @4xl:grid-cols-3",
            query.isPlaceholderData && "opacity-60",
          )}>
          {query.isPending ? (
            Array.from({ length: PAGE_SIZE }, (_, index) => (
              <li
                key={index}
                className='flex h-16 items-center gap-3 rounded-lg border border-gray-100 px-3'>
                <Skeleton className='size-8 shrink-0 rounded-md' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-3.5 w-3/4' />
                  <Skeleton className='h-3 w-1/2' />
                </div>
              </li>
            ))
          ) : offices.length === 0 ? (
            <li className='col-span-full flex flex-col items-center justify-center gap-1 py-10 text-center'>
              <Building2 className='size-6 text-gray-300' />
              <p className='text-sm text-gray-500'>
                {debouncedSearch
                  ? `No offices match “${debouncedSearch}”.`
                  : "No offices to choose from."}
              </p>
            </li>
          ) : (
            offices.map((office) => {
              const isSelected = office.id === value;
              return (
                <li key={office.id}>
                  <button
                    type='button'
                    role='radio'
                    aria-checked={isSelected}
                    onClick={() => choose(office)}
                    className={cn(
                      "flex h-16 w-full items-center gap-3 rounded-lg border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-500/25",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    )}>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-md",
                        isSelected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-400",
                      )}>
                      <Building2 className='size-4' />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-sm font-medium text-gray-900'>
                        {capitalizeEachWord(office.name)}
                      </span>
                      <span className='mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-gray-500'>
                        <span className='shrink-0 font-mono text-[11px] text-gray-400'>
                          {office.code}
                        </span>
                        {location(office) && (
                          <>
                            <MapPin className='size-3 shrink-0 text-gray-400' />
                            <span className='truncate'>{location(office)}</span>
                          </>
                        )}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-gray-300 bg-white",
                      )}>
                      {isSelected && <Check className='size-3' />}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <TablePagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        noun='offices'
        onPageChange={setPage}
        className='border-t border-gray-100 bg-gray-50/50'
      />
    </div>
  );
};

export default OfficePicker;

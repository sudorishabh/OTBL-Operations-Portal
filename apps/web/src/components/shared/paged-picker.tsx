"use client";
import React from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import RecordCode from "@/components/shared/record-code";

export interface PickerItem {
  id: number;
  name: string;
  code?: string | null;
  // A quieter detail beside the name, such as a site's city.
  hint?: string | null;
}

// Each row's height, so a page of rows takes the same room while it loads.
const ROW_HEIGHT = 36;

interface Props {
  label: string;
  noun: { one: string; many: string };
  // One choice, as a radio, or any number, as checkboxes.
  mode: "single" | "multiple";
  selected: PickerItem[];
  onChange: (selected: PickerItem[]) => void;
  // The page being shown, and how it was found.
  items: PickerItem[];
  isLoading: boolean;
  // A new page or search on its way, with the last one still shown.
  isFetching?: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  // Beside the label, such as a button to add a new one.
  action?: React.ReactNode;
  // When there is nothing to pick at all.
  emptyText: string;
  className?: string;
}

// Picks from a long list a page at a time: what is chosen, as chips that can
// be removed, then a search, the page of choices and the pages to step
// through. The list is never loaded all at once.
const PagedPicker = ({
  label,
  noun,
  mode,
  selected,
  onChange,
  items,
  isLoading,
  isFetching = false,
  search,
  onSearchChange,
  page,
  pageSize,
  total,
  onPageChange,
  action,
  emptyText,
  className,
}: Props) => {
  const selectedIds = new Set(selected.map((item) => item.id));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const toggle = (item: PickerItem) => {
    if (mode === "single") {
      if (!selectedIds.has(item.id)) onChange([item]);
      return;
    }
    onChange(
      selectedIds.has(item.id)
        ? selected.filter((chosen) => chosen.id !== item.id)
        : [...selected, item],
    );
  };
  const remove = (id: number) =>
    onChange(selected.filter((chosen) => chosen.id !== id));

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white",
        className,
      )}>
      <div className='flex min-h-10 items-center justify-between gap-2 border-b border-gray-100 px-3 py-2'>
        <p className='flex min-w-0 items-baseline gap-2'>
          <span className='text-xs font-semibold text-gray-800'>{label}</span>
          <span className='text-[11px] text-gray-400'>
            {mode === "single"
              ? selected.length > 0
                ? "1 chosen"
                : `Choose one ${noun.one}`
              : `${selected.length} chosen`}
          </span>
        </p>
        {action}
      </div>

      {/* What is chosen, wherever it is in the list. */}
      {selected.length > 0 && (
        <div className='flex max-h-24 flex-wrap gap-1.5 overflow-y-auto border-b border-gray-100 bg-emerald-50/50 px-3 py-2'>
          {selected.map((item) => (
            <span
              key={item.id}
              className='inline-flex max-w-full items-center gap-1.5 rounded-full bg-white py-0.5 pl-1.5 pr-0.5 text-xs text-gray-800 ring-1 ring-inset ring-emerald-200'>
              {item.code && <RecordCode code={item.code} />}
              <span className='truncate'>{item.name}</span>
              <button
                type='button'
                aria-label={`Remove ${item.name}`}
                onClick={() => remove(item.id)}
                className='rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700'>
                <X className='size-3' />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className='relative border-b border-gray-100'>
        <Search className='pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-gray-400' />
        <input
          type='search'
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${noun.many} by code or name`}
          aria-label={`Search ${noun.many}`}
          className='h-9 w-full bg-transparent pl-8 pr-3 text-xs outline-none placeholder:text-gray-400 focus:bg-gray-50/60'
        />
      </div>

      <ul
        aria-label={label}
        aria-busy={isLoading || isFetching}
        className={cn(
          "divide-y divide-gray-50 transition-opacity",
          isFetching && "opacity-60",
        )}
        style={{ minHeight: pageSize * ROW_HEIGHT }}>
        {isLoading ? (
          Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
            <li
              key={index}
              className='flex h-9 items-center gap-2.5 px-3'>
              <Skeleton className='size-4 shrink-0 rounded' />
              <Skeleton className='h-3 w-16' />
              <Skeleton className='h-3 w-40' />
            </li>
          ))
        ) : items.length === 0 ? (
          <li className='px-3 py-8 text-center text-xs text-gray-400'>
            {search.trim()
              ? `No ${noun.many} match “${search.trim()}”.`
              : emptyText}
          </li>
        ) : (
          items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type='button'
                  aria-pressed={isSelected}
                  onClick={() => toggle(item)}
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 px-3 text-left text-xs transition-colors focus-visible:bg-gray-50 focus-visible:outline-none",
                    isSelected
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-gray-700 hover:bg-gray-50",
                  )}>
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center border transition-colors",
                      mode === "single" ? "rounded-full" : "rounded",
                      isSelected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-300 bg-white",
                    )}>
                    {isSelected &&
                      (mode === "single" ? (
                        <span className='size-1.5 rounded-full bg-white' />
                      ) : (
                        <Check className='size-3' />
                      ))}
                  </span>
                  {item.code && <RecordCode code={item.code} />}
                  <span className='min-w-0 flex-1 truncate font-medium'>
                    {item.name}
                  </span>
                  {item.hint && (
                    <span className='shrink-0 truncate text-[11px] text-gray-400'>
                      {item.hint}
                    </span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <div className='mt-auto flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-500'>
        <span className='tabular-nums'>
          {total === 0 ? `No ${noun.many}` : `${from}–${to} of ${total}`}
        </span>
        <div className='flex items-center gap-1'>
          <button
            type='button'
            aria-label='Previous page'
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className='rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-30'>
            <ChevronLeft className='size-3.5' />
          </button>
          <span className='min-w-12 text-center tabular-nums'>
            {page} / {totalPages}
          </span>
          <button
            type='button'
            aria-label='Next page'
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className='rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-30'>
            <ChevronRight className='size-3.5' />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PagedPicker;

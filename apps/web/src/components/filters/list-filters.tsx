"use client";
import React, { useMemo, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FilterOption = {
  value: string;
  label: string;
  /** A second, quieter line, e.g. a client's city. */
  hint?: string;
};

// The value every list filter uses for "don't filter by this".
export const ALL = "all";

const controlClass =
  "h-8! rounded-md border bg-white text-xs shadow-xs transition-colors";
const activeClass = "border-emerald-300 bg-emerald-50/60 text-emerald-900";

// The row a list's search, filters, sort and clear button sit in; on phones
// the search takes a line and the rest go two to a line under it.
export const FilterBar = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center",
      className,
    )}>
    {children}
  </div>
);

export const SearchFilter = ({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) => (
  <div className={cn("relative col-span-2 w-full sm:w-72", className)}>
    <Search className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400' />
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className='h-8 bg-white pl-8 pr-8 text-xs placeholder:text-xs'
    />
    {value && (
      <button
        type='button'
        onClick={() => onChange("")}
        aria-label='Clear search'
        className='absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600'>
        <X className='size-3.5' />
      </button>
    )}
  </div>
);

// A short, fixed list of choices, such as a status or the sort order.
export const SelectFilter = ({
  label,
  value,
  onChange,
  options,
  Icon,
  defaultValue = options[0]?.value,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  Icon?: LucideIcon;
  /** Any other value is shown as an applied filter; null never is. */
  defaultValue?: string | null;
  className?: string;
}) => {
  const isApplied = defaultValue !== null && value !== defaultValue;

  return (
    <Select
      value={value}
      onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        title={label}
        className={cn(
          controlClass,
          "w-full cursor-pointer gap-1.5 px-2.5 sm:w-auto",
          isApplied && activeClass,
          className,
        )}>
        {/* Grows so the label sits by its icon, not centered, on phones. */}
        <span className='flex min-w-0 flex-1 items-center gap-1.5'>
          {Icon && <Icon className='size-3.5 text-gray-400' />}
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent className='text-xs'>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className='text-xs'>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Only this many matches are drawn; typing narrows long lists down.
const MAX_SHOWN = 100;

// A long list from the data, such as clients or offices, picked by searching.
export const ComboboxFilter = ({
  label,
  allLabel,
  value,
  onChange,
  options,
  pinnedOptions = [],
  isLoading = false,
  searchPlaceholder,
  Icon,
  className,
}: {
  label: string;
  /** Shown when nothing is picked, e.g. "All clients". */
  allLabel: string;
  /** ALL when nothing is picked. */
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  /** Choices kept above the list whatever the search, e.g. "No main client". */
  pinnedOptions?: FilterOption[];
  isLoading?: boolean;
  searchPlaceholder: string;
  Icon?: LucideIcon;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = [...pinnedOptions, ...options].find(
    (option) => option.value === value,
  );
  const isApplied = value !== ALL;

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) =>
      `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(term),
    );
  }, [options, search]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearch("");
  };

  const renderOption = (option: FilterOption) => {
    const isSelected = option.value === value;
    return (
      <button
        key={option.value}
        type='button'
        onClick={() => choose(option.value)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
          isSelected ? "bg-emerald-50 text-emerald-900" : "hover:bg-gray-100",
        )}>
        <span className='min-w-0 flex-1'>
          <span className='block truncate'>{option.label}</span>
          {option.hint && (
            <span className='block truncate text-[11px] text-gray-400'>
              {option.hint}
            </span>
          )}
        </span>
        {isSelected && <Check className='size-3.5 shrink-0 text-emerald-600' />}
      </button>
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}>
      <PopoverTrigger asChild>
        <button
          type='button'
          aria-label={label}
          title={label}
          disabled={isLoading}
          className={cn(
            controlClass,
            "flex w-full cursor-pointer items-center gap-1.5 border-input px-2.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:max-w-56",
            isApplied && activeClass,
            className,
          )}>
          {Icon && <Icon className='size-3.5 shrink-0 text-gray-400' />}
          <span className='min-w-0 flex-1 truncate'>
            {selected?.label ?? allLabel}
          </span>
          <ChevronsUpDown className='size-3.5 shrink-0 text-gray-400' />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-72 p-0'>
        <div className='flex items-center gap-2 border-b px-2.5'>
          <Search className='size-3.5 shrink-0 text-gray-400' />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) {
                event.preventDefault();
                choose(matches[0].value);
              }
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className='h-9 w-full bg-transparent text-xs outline-none placeholder:text-gray-400'
          />
        </div>
        <div className='max-h-72 overflow-y-auto p-1'>
          {!search &&
            [{ value: ALL, label: allLabel }, ...pinnedOptions].map(
              renderOption,
            )}
          {!search && options.length > 0 && <div className='my-1 border-t' />}
          {matches.slice(0, MAX_SHOWN).map(renderOption)}
          {matches.length === 0 && (
            <p className='px-2 py-6 text-center text-xs text-gray-400'>
              No matches
            </p>
          )}
        </div>
        {matches.length > MAX_SHOWN && (
          <p className='border-t px-3 py-1.5 text-[11px] text-gray-400'>
            Showing {MAX_SHOWN} of {matches.length}. Type to narrow down.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export const ClearFiltersButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    type='button'
    variant='ghost'
    onClick={onClick}
    className='h-8 gap-1 px-2.5 text-xs text-gray-600'>
    <X className='size-3.5' />
    Clear filters
  </Button>
);

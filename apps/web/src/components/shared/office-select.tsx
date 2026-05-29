"use client";

import React, { useMemo, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { capitalizeEachWord } from "@pkg/utils";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";

export interface OfficeOption {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
}

interface OfficeSelectProps {
  offices: OfficeOption[];
  value?: number;
  onChange: (officeId: number) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const formatLocation = (office: OfficeOption) => {
  const parts = [office.city, office.state].filter(Boolean) as string[];
  return parts.map((part) => capitalizeEachWord(part)).join(", ");
};

/**
 * Searchable office picker. Renders a rich trigger (name + location) and a
 * filterable list so users can find an office by name, city, state, or address
 * instead of scanning a flat dropdown.
 */
const OfficeSelect = ({
  offices,
  value,
  onChange,
  isLoading = false,
  disabled = false,
  placeholder = "Select an office",
}: OfficeSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOffice = useMemo(
    () => offices.find((office) => office.id === value),
    [offices, value],
  );

  const filteredOffices = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return offices;
    return offices.filter((office) => {
      const haystack = [office.name, office.city, office.state, office.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [offices, search]);

  const isDisabled = disabled || isLoading;

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
          disabled={isDisabled}
          aria-expanded={open}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-md border border-input bg-gray-100/50 px-2.5 text-left text-sm transition-colors",
            "hover:bg-gray-100 focus:outline-none focus:ring-[3px] focus:ring-ring/50",
            isDisabled && "cursor-not-allowed opacity-50",
          )}>
          <span className='flex min-w-0 items-center gap-2'>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                selectedOffice
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-200 text-gray-400",
              )}>
              <Building2 className='size-4' />
            </span>
            {selectedOffice ? (
              <span className='flex min-w-0 flex-col leading-tight'>
                <span className='truncate font-medium text-neutral-800'>
                  {capitalizeEachWord(selectedOffice.name)}
                </span>
                {formatLocation(selectedOffice) && (
                  <span className='truncate text-xs text-neutral-500'>
                    {formatLocation(selectedOffice)}
                  </span>
                )}
              </span>
            ) : (
              <span className='text-neutral-400'>
                {isLoading ? "Loading offices..." : placeholder}
              </span>
            )}
          </span>
          {isLoading ? (
            <Loader2 className='size-4 shrink-0 animate-spin text-neutral-400' />
          ) : (
            <ChevronsUpDown className='size-4 shrink-0 text-neutral-400' />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align='start'
        className='w-[var(--radix-popover-trigger-width)] p-0'>
        <div className='flex items-center gap-2 border-b px-3'>
          <Search className='size-4 shrink-0 text-neutral-400' />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search by name, city, or address...'
            className='h-10 w-full bg-transparent text-sm outline-none placeholder:text-neutral-400'
          />
        </div>

        <div className='max-h-64 overflow-y-auto p-1'>
          {filteredOffices.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-1 px-3 py-8 text-center'>
              <Building2 className='size-6 text-neutral-300' />
              <p className='text-sm text-neutral-500'>No offices found</p>
              {search && (
                <p className='text-xs text-neutral-400'>
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            filteredOffices.map((office) => {
              const isSelected = office.id === value;
              const location = formatLocation(office);
              return (
                <button
                  key={office.id}
                  type='button'
                  onClick={() => {
                    onChange(office.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
                    isSelected ? "bg-emerald-50" : "hover:bg-gray-100",
                  )}>
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md",
                      isSelected
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-400",
                    )}>
                    <Building2 className='size-4' />
                  </span>
                  <span className='flex min-w-0 flex-col leading-tight'>
                    <span className='truncate text-sm font-medium text-neutral-800'>
                      {capitalizeEachWord(office.name)}
                    </span>
                    {location && (
                      <span className='flex items-center gap-1 truncate text-xs text-neutral-500'>
                        <MapPin className='size-3 shrink-0' />
                        <span className='truncate'>{location}</span>
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check className='ml-auto size-4 shrink-0 text-emerald-600' />
                  )}
                </button>
              );
            })
          )}
        </div>

        {!isLoading && offices.length > 0 && (
          <div className='border-t px-3 py-2 text-xs text-neutral-400'>
            {filteredOffices.length} of {offices.length}{" "}
            {offices.length === 1 ? "office" : "offices"}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default OfficeSelect;

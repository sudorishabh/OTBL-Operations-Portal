"use client";
import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// A start date and an end date, each picked on its own calendar. Either can
// be left open: a start alone is that day on, an end alone is up to that
// day. The end can't be picked before the start, nor the start after the end.

interface Props {
  // YYYY-MM-DD, both days included.
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
  startLabel?: string;
  endLabel?: string;
}

const toDay = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : undefined);
const dayLabel = (day: string) => format(parseISO(day), "d MMM yyyy");

// The years the month and year menus reach.
const FIRST_MONTH = new Date(2015, 0, 1);
const lastMonth = () => new Date(new Date().getFullYear() + 1, 11, 1);

const DateField = ({
  label,
  value,
  onPick,
  disabled,
  openingMonth,
}: {
  label: string;
  value?: string;
  onPick: (day?: string) => void;
  disabled?: { before: Date } | { after: Date };
  // The month shown when nothing is picked yet, such as the other end's.
  openingMonth?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const opening =
    selected ?? (openingMonth ? parseISO(openingMonth) : undefined);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          aria-label={value ? `${label}: ${dayLabel(value)}` : `${label}: any`}
          className={cn(
            "inline-flex h-8 w-full cursor-pointer items-center gap-2 rounded-md border bg-white px-2.5 text-xs pointer-coarse:h-10 shadow-xs transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto",
            value ? "border-emerald-300 bg-emerald-50/60" : "border-input",
          )}>
          <CalendarDays className='size-3.5 shrink-0 text-gray-400' />
          <span className='text-gray-500'>{label}</span>
          <span
            className={cn(
              "font-medium",
              value ? "text-emerald-900" : "text-gray-400",
            )}>
            {value ? dayLabel(value) : "Any"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-auto p-0'>
        <Calendar
          mode='single'
          startMonth={FIRST_MONTH}
          endMonth={lastMonth()}
          selected={selected}
          defaultMonth={opening}
          disabled={disabled}
          onSelect={(date) => {
            onPick(toDay(date));
            setOpen(false);
          }}
        />
        {value && (
          <div className='flex justify-end border-t p-2'>
            <button
              type='button'
              onClick={() => {
                onPick(undefined);
                setOpen(false);
              }}
              className='inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100'>
              <X className='size-3.5' />
              Clear {label.toLowerCase()}
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const StartEndDateFilter = ({
  from,
  to,
  onChange,
  startLabel = "Start date",
  endLabel = "End date",
}: Props) => (
  <>
    <DateField
      label={startLabel}
      value={from}
      onPick={(day) => onChange(day, to)}
      disabled={to ? { after: parseISO(to) } : undefined}
      openingMonth={to}
    />
    <DateField
      label={endLabel}
      value={to}
      onPick={(day) => onChange(from, day)}
      disabled={from ? { before: parseISO(from) } : undefined}
      openingMonth={from}
    />
  </>
);

export default StartEndDateFilter;

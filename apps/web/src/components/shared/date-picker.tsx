"use client";
import React, { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// A yyyy-MM-dd day, or a saved Date, as a local date; else undefined.
const toDate = (value: Date | string | null | undefined) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? date : undefined;
};

interface DatePickerProps {
  // yyyy-MM-dd, as a date input holds it. Forms may load a saved Date.
  value: Date | string | null | undefined;
  // Gets the picked day as yyyy-MM-dd, or "" once cleared.
  onChange: (value: string) => void;
  // The first and last days that can be picked, as yyyy-MM-dd, like a date
  // input's min and max. The year dropdown stops at their years too.
  min?: string;
  max?: string;
  disabled?: boolean;
  // Lets an optional date be emptied again.
  clearable?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

// A date field opening a calendar with month and year dropdowns, so a day
// years away is a few taps off. It closes once a day is picked. Used in
// place of the browser's own date input, whose calendar steps a month at a
// time.
const DatePicker = ({
  value,
  onChange,
  min,
  max,
  disabled,
  clearable = false,
  placeholder = "Pick a date",
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);
  const picked = toDate(value);
  const first = toDate(min);
  const last = toDate(max);

  // With no day picked, open on today, kept within the days allowed.
  const today = new Date();
  const opening =
    picked ??
    (last && today > last ? last : first && today < first ? first : today);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-start gap-2 px-3 text-left font-normal",
            !picked && "text-muted-foreground",
            className,
          )}>
          <CalendarIcon className='size-4 shrink-0 text-gray-500' />
          <span className='truncate'>
            {picked ? format(picked, "d MMM yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-auto p-0'
        align='start'>
        <Calendar
          mode='single'
          selected={picked}
          defaultMonth={opening}
          {...(first && { startMonth: first })}
          {...(last && { endMonth: last })}
          disabled={[
            ...(first ? [{ before: first }] : []),
            ...(last ? [{ after: last }] : []),
          ]}
          onSelect={(day) => {
            // Tapping the picked day again keeps it rather than clearing it.
            if (day) onChange(format(day, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
        {clearable && picked && (
          <div className='flex justify-end border-t p-2'>
            <button
              type='button'
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className='inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100'>
              <X className='size-3.5' />
              Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;

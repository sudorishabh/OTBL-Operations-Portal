import React from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  // YYYY-MM-DD, both ends included.
  from?: string;
  to?: string;
  onChange: (from?: string, to?: string) => void;
}

const toDay = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : undefined);
const label = (day: string) => format(parseISO(day), "d MMM yy");

// A range of submission dates, picked on a two-month calendar.
const SubmittedDateFilter = ({ from, to, onChange }: Props) => {
  const selected: DateRange | undefined = from
    ? { from: parseISO(from), to: to ? parseISO(to) : undefined }
    : undefined;
  const summary = !from
    ? "Any date"
    : !to || to === from
      ? label(from)
      : `${label(from)} – ${label(to)}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={cn(
            "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 text-xs shadow-xs transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
            from ? "border-emerald-300" : "border-input",
          )}>
          <CalendarDays className='size-3.5 text-gray-400' />
          <span className='text-gray-500'>Submitted</span>
          <span className='font-medium text-gray-800'>{summary}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        className='w-auto p-0'>
        <Calendar
          mode='range'
          numberOfMonths={2}
          selected={selected}
          defaultMonth={selected?.from}
          onSelect={(range) => onChange(toDay(range?.from), toDay(range?.to))}
        />
        {from && (
          <div className='flex justify-end border-t p-2'>
            <button
              type='button'
              onClick={() => onChange(undefined, undefined)}
              className='inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100'>
              <X className='size-3.5' />
              Clear dates
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SubmittedDateFilter;

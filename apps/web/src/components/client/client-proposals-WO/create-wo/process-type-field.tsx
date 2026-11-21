"use client";
import React from "react";
import { Check, FlaskConical, RotateCcw } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { constants } from "@pkg/utils";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PROCESS_TONES } from "@/components/work-order/process-section-header";
import { cn } from "@/lib/utils";

const { WO_PROCESS } = constants;

// Each process as a card: its icons, in the colours the work order page gives
// it, and what it means for the work.
const PROCESSES = [
  {
    value: WO_PROCESS.BIOREMEDIATION,
    label: "Bioremediation",
    description:
      "Contaminated soil treated site by site, through purchase orders and sub-contracts.",
    tones: ["bioremediation"],
  },
  {
    value: WO_PROCESS.RESTORATION,
    label: "Restoration",
    description:
      "The spill area cleaned and restored across the work order, through job orders.",
    tones: ["restoration"],
  },
  {
    value: WO_PROCESS.BIOREMEDIATION_RESTORATION,
    label: "Both",
    description:
      "Restoration across the work order, and bioremediation at each of its sites.",
    tones: ["restoration", "bioremediation"],
  },
] as const;

const ICONS = { bioremediation: FlaskConical, restoration: RotateCcw };

// The work order's process, picked from cards rather than a dropdown, so each
// choice says what it means. It decides the schedule of rates on the next
// step, and can't be changed once the work order exists.
const ProcessTypeField = () => {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name='process_type'
      render={({ field, fieldState }) => (
        <FormItem className='space-y-1.5'>
          <FormLabel className='text-xs font-medium text-neutral-700'>
            Process Type
          </FormLabel>
          <div
            role='radiogroup'
            aria-label='Process type'
            aria-invalid={!!fieldState.error}
            className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            {PROCESSES.map((process) => {
              const isSelected = field.value === process.value;
              return (
                <button
                  key={process.value}
                  type='button'
                  role='radio'
                  aria-checked={isSelected}
                  onClick={() => {
                    field.onChange(process.value);
                    // Clears the error from a try to go on without one.
                    if (fieldState.error) void form.trigger("process_type");
                  }}
                  onBlur={field.onBlur}
                  className={cn(
                    "relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-emerald-500/25 sm:flex-col sm:gap-2.5",
                    isSelected
                      ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                      : fieldState.error
                        ? "border-destructive/60 hover:bg-gray-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                  )}>
                  <span className='flex shrink-0 gap-1.5'>
                    {process.tones.map((tone) => {
                      const Icon = ICONS[tone];
                      return (
                        <span
                          key={tone}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-md ring-1 ring-inset",
                            PROCESS_TONES[tone].icon,
                          )}>
                          <Icon className='size-4.5' />
                        </span>
                      );
                    })}
                  </span>
                  <span className='min-w-0 flex-1 pr-6 sm:pr-0'>
                    <span className='block text-sm font-semibold text-gray-900'>
                      {process.label}
                    </span>
                    <span className='mt-0.5 block text-xs leading-relaxed text-gray-500'>
                      {process.description}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border transition-colors",
                      isSelected
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-300 bg-white",
                    )}>
                    {isSelected && <Check className='size-3' />}
                  </span>
                </button>
              );
            })}
          </div>
          <FormMessage className='text-xs' />
        </FormItem>
      )}
    />
  );
};

export default ProcessTypeField;

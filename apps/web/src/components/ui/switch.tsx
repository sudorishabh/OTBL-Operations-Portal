"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// An on/off toggle, read out as a switch.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-200",
        className,
      )}
      {...props}>
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className='pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5'
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

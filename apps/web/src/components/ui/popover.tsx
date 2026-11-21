"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

// Popovers are modal, so their lists scroll even inside a dialog, whose scroll
// lock otherwise swallows wheel and touch scrolling outside its own content.
const Popover = ({
  modal = true,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) => (
  <PopoverPrimitive.Root
    modal={modal}
    {...props}
  />
);

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  (
    { className, align = "center", sideOffset = 4, onOpenAutoFocus, ...props },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          // On touch screens, focusing a search box would pop the keyboard up
          // over the list; keep focus on the popover until a field is tapped.
          if (window.matchMedia("(pointer: coarse)").matches) {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus();
          }
        }}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };

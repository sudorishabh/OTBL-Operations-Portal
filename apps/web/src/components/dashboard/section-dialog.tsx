"use client";
import React from "react";
import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Opens a card's section in its dialog, at the card's top right.
export const ExpandButton = ({
  title,
  onClick,
}: {
  // The section's name, for screen readers and the tooltip.
  title: string;
  onClick: () => void;
}) => (
  <button
    type='button'
    onClick={onClick}
    title={`Expand ${title.toLowerCase()}`}
    aria-label={`Expand ${title.toLowerCase()}`}
    className='flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40'>
    <Maximize2 className='size-3.5' />
  </button>
);

// A section of the overview opened large: its title, a row of filters that
// stays put, and its content scrolling under them. Phones get the whole
// screen.
export const SectionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  filters,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Dialog
    open={open}
    onOpenChange={onOpenChange}>
    <DialogContent
      className={cn(
        "flex flex-col gap-0 overflow-hidden p-0",
        "max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:rounded-none max-sm:border-0",
        "sm:max-h-[calc(100dvh-3rem)] sm:max-w-[min(72rem,calc(100vw-3rem))]",
      )}>
      <DialogHeader className='shrink-0 border-b border-gray-200 px-5 py-3 pr-12 text-left'>
        <DialogTitle className='text-[16px] text-gray-900'>{title}</DialogTitle>
        <DialogDescription className='text-[12px] text-gray-500'>
          {description}
        </DialogDescription>
      </DialogHeader>
      {filters && (
        <div className='shrink-0 border-b border-gray-200 bg-gray-50/70 px-5 py-2.5'>
          {filters}
        </div>
      )}
      <div className='min-h-0 flex-1 overflow-y-auto'>{children}</div>
    </DialogContent>
  </Dialog>
);

// The figures a dialog leads with, side by side, wrapping on phones.
export const DialogFigures = ({
  figures,
}: {
  figures: { label: string; value: React.ReactNode; hint?: string }[];
}) => (
  <dl className='grid grid-cols-2 divide-gray-200 border-b border-gray-200 sm:flex sm:divide-x'>
    {figures.map((figure) => (
      <div
        key={figure.label}
        className='min-w-0 px-5 py-3 sm:flex-1'>
        <dt className='truncate text-[11px] text-gray-500'>{figure.label}</dt>
        <dd className='mt-0.5 truncate text-[18px] font-semibold leading-tight text-gray-900'>
          {figure.value}
        </dd>
        {figure.hint && (
          <p className='truncate text-[11px] text-gray-400'>{figure.hint}</p>
        )}
      </div>
    ))}
  </dl>
);

// A dialog's content dims while new figures for changed filters load, so
// nothing jumps.
export const Refreshing = ({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) => (
  <div
    aria-busy={active}
    className={cn("transition-opacity", active && "opacity-50")}>
    {children}
  </div>
);

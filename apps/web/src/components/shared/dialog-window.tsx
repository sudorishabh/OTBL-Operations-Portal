"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Maximize2, Minimize2 } from "lucide-react";
import { FormSkeleton, ListSkeleton } from "../skeleton/dialog-skeletons";

type HeightMode = "auto" | "fixed" | "full";

interface Props {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  className?: string;
  title?: string;
  size: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  description?: string;

  heightFull?: boolean;

  heightMode?: HeightMode;
  isLoading?: boolean;
  // What to sketch while loading: a form (the default) or a list.
  loadingSkeleton?: "form" | "list";
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

const DialogWindow = ({
  children,
  open,
  setOpen,
  className,
  title,
  description,
  size,
  heightFull,
  heightMode = "auto",
  isLoading,
  loadingSkeleton = "form",
  isFullScreen,
  onToggleFullScreen,
}: Props) => {
  const effectiveHeightMode: HeightMode = heightFull ? "full" : heightMode;

  // Never wider than the screen, less a margin, however wide the size.
  const widthClasses: Record<typeof size, string> = {
    sm: "w-[100vw] sm:max-w-[min(525px,calc(100%-2rem))]",
    md: "w-[100vw] sm:max-w-[min(700px,calc(100%-2rem))]",
    lg: "w-[100vw] sm:max-w-[min(900px,calc(100%-2rem))]",
    xl: "w-[100vw] sm:max-w-[min(1200px,calc(100%-2rem))]",
    "2xl": "w-[100vw] sm:max-w-[min(1400px,calc(100%-2rem))]",
    full: "w-[calc(100vw-4rem)] max-w-none sm:max-w-none",
  };

  const fixedHeightClasses: Record<typeof size, string> = {
    sm: "h-[400px]",
    md: "h-[500px]",
    lg: "h-[600px]",
    xl: "h-[700px]",
    "2xl": "h-[800px]",
    full: "h-[calc(100dvh-4rem)]",
  };

  // On phones, big or full height dialogs take the whole screen, so tables and
  // long forms get every pixel; small ones stay a card over the page.
  const phoneFullScreen =
    size === "lg" ||
    size === "xl" ||
    size === "2xl" ||
    size === "full" ||
    effectiveHeightMode === "full";

  const getHeightClasses = (): string => {
    switch (effectiveHeightMode) {
      case "full":
        return "h-[calc(100dvh-4rem)]";
      case "fixed":
        return fixedHeightClasses[size];
      case "auto":
      default:
        return "";
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0",
          !isFullScreen && [
            "max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-4rem)]",
            widthClasses[size],
            getHeightClasses(),
            phoneFullScreen &&
              "max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0",
          ],
          isFullScreen &&
            "w-screen h-screen max-w-none sm:max-w-none max-h-none rounded-none border-none",
          className,
        )}>
        {onToggleFullScreen && (
          <button
            onClick={onToggleFullScreen}
            className='absolute right-12 top-4 hidden rounded-sm sm:block opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'>
            {isFullScreen ? (
              <Minimize2 className='h-4 w-4' />
            ) : (
              <Maximize2 className='h-4 w-4' />
            )}
            <span className='sr-only'>Toggle Fullscreen</span>
          </button>
        )}

        {(title || description) && (
          <DialogHeader
            className={cn(
              "shrink-0 px-6 pb-4 sm:pl-0",
              onToggleFullScreen ? "sm:pr-16" : "sm:pr-6",
            )}>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}

        <div
          className={cn(
            "flex-1 min-h-0",
            "overflow-y-auto overflow-x-hidden",
            "-mx-4 px-4 sm:-mx-6 sm:px-6",
            "pb-1",
          )}>
          {isLoading ? (
            loadingSkeleton === "list" ? (
              <ListSkeleton />
            ) : (
              <FormSkeleton />
            )
          ) : (
            <div className='h-full'>{children}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DialogWindow;

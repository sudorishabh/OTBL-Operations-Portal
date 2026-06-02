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
import Loading from "../loading/Loading";

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
  isFullScreen,
  onToggleFullScreen,
}: Props) => {
  const effectiveHeightMode: HeightMode = heightFull ? "full" : heightMode;

  const widthClasses: Record<typeof size, string> = {
    sm: "w-[100vw] sm:max-w-[525px]",
    md: "w-[100vw] sm:max-w-[700px]",
    lg: "w-[100vw] sm:max-w-[900px]",
    xl: "w-[100vw] sm:max-w-[1200px]",
    "2xl": "w-[100vw] sm:max-w-[1400px]",
    full: "w-[calc(100vw-4rem)] max-w-none sm:max-w-none",
  };

  const fixedHeightClasses: Record<typeof size, string> = {
    sm: "h-[400px]",
    md: "h-[500px]",
    lg: "h-[600px]",
    xl: "h-[700px]",
    "2xl": "h-[800px]",
    full: "h-[calc(100vh-4rem)]",
  };

  const getHeightClasses = (): string => {
    switch (effectiveHeightMode) {
      case "full":
        return "h-[calc(100vh-4rem)]";
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
            "max-h-[calc(100vh-4rem)]",
            widthClasses[size],
            getHeightClasses(),
          ],
          isFullScreen &&
            "w-screen h-screen max-w-none sm:max-w-none max-h-none rounded-none border-none",
          className,
        )}>
        {onToggleFullScreen && (
          <button
            onClick={onToggleFullScreen}
            className='absolute right-12 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground'>
            {isFullScreen ? (
              <Minimize2 className='h-4 w-4' />
            ) : (
              <Maximize2 className='h-4 w-4' />
            )}
            <span className='sr-only'>Toggle Fullscreen</span>
          </button>
        )}

        {(title || description) && (
          <DialogHeader className='shrink-0 pb-4'>
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
            "-mx-6 px-6",
            "pb-1",
          )}>
          {isLoading ? (
            <div className='h-full flex items-center justify-center min-h-[200px]'>
              <Loading />
            </div>
          ) : (
            <div className='h-full'>{children}</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DialogWindow;

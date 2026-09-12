"use client";
import React from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useIsViewer } from "@/contexts/AuthContext";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Loader,
} from "lucide-react";

interface Props {
  Icon?: React.ElementType;
  text?: string;
  className?: string;
  variant: "primary" | "secondary" | "outline" | "arrow";
  arrowType?: "right" | "left" | "upright" | "downright";
  onClick?: (e?: React.MouseEvent) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  disableForViewer?: boolean;
  /** Tooltip + accessible name. Falls back to `text` when omitted. */
  title?: string;
}

const Btn = ({
  Icon,
  text,
  className,
  onClick,
  variant,
  arrowType,
  type = "button",
  disabled = false,
  loading = false,
  disableForViewer = false,
  title,
}: Props) => {
  const isViewer = useIsViewer();
  const blockedForViewer = disableForViewer && isViewer && variant !== "arrow";
  const isDisabled = disabled || loading || blockedForViewer;

  let variantStyle = "";
  let variantIconStyle = "";

  switch (variant) {
    case "primary":
      variantStyle =
        "bg-emerald-600 text-gray-100 rounded-md cursor-pointer hover:bg-emerald-700/90 shadow-sm transition-all duration-200 hover:shadow-md gap-1.5 h-8 text-[0.813rem]";
      break;
    case "secondary":
      variantStyle =
        "bg-gray-50 text-gray-700 rounded-md cursor-pointer borde hover:bg-gray-200/60 shadow-sm transition-all duration-200 hover:shadow-sm gap-1.5 h-8 text-[0.813rem]";
      break;
    case "outline":
      variantStyle =
        "bg-white text-gray-800 shadow-none hover:bg-gray-50 cursor-pointer border border-gray-300/70 shadow-s transition-all duration-200  h-8 text-[0.813rem]";
      break;
  }

  switch (variant) {
    case "primary":
      variantIconStyle = "size-3.5 text-gray-100";
      break;
    case "secondary":
      variantIconStyle = "size-3.5 text-gray-700";
      break;
    case "outline":
      variantIconStyle = "size-3.5 text-gray-700";
      break;
  }

  const ArrowIcon =
    arrowType === "right"
      ? ArrowRight
      : arrowType === "left"
        ? ArrowLeft
        : arrowType === "upright"
          ? ArrowUpRight
          : arrowType === "downright"
            ? ArrowDownRight
            : null;

  const accessibleName = title || text;

  return (
    <>
      {variant === "arrow" ? (
        text ? (
          <button
            type={type}
            onClick={onClick}
            title={accessibleName}
            className={cn(
              "group h-8 inline-flex items-center gap-2 rounded-full border border-gray-300/70 bg-white pl-3 pr-1 text-[0.813rem] font-medium text-gray-700 cursor-pointer transition-all duration-200 hover:border-emerald-600/40 hover:shadow-sm",
              className,
            )}>
            {text}
            <span className='flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors duration-200 group-hover:bg-emerald-600 group-hover:text-white'>
              {ArrowIcon && <ArrowIcon className='h-3.5 w-3.5' />}
            </span>
          </button>
        ) : (
          <div
            role='button'
            tabIndex={0}
            title={accessibleName}
            aria-label={accessibleName}
            className={cn(
              "h-8 w-8 rounded-full bg-white border group-hover:border-0 flex items-center justify-center group hover:bg-emerald-600 relative cursor-pointer transition-all duration-200 hover:shadow-sm",
              className,
            )}
            onClick={onClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }}>
            {ArrowIcon && (
              <ArrowIcon className='h-4 w-4 text-emerald-700 group-hover:text-white' />
            )}
          </div>
        )
      ) : blockedForViewer ? (
        <span
          title='Read-only access — viewers cannot make changes'
          className='inline-block cursor-not-allowed'>
          <Button
            type={type}
            className={cn(variantStyle, "cursor-not-allowed", className)}
            disabled>
            {Icon && (
              <Icon
                className={variantIconStyle}
                size={16}
              />
            )}
            {text}
          </Button>
        </span>
      ) : (
        <Button
          type={type}
          className={cn(
            variantStyle,
            isDisabled ? "cursor-not-allowed" : "",
            className,
          )}
          onClick={onClick}
          disabled={isDisabled}>
          {loading && <Loader className='animate-spin' />}
          {Icon && !loading && (
            <Icon
              className={variantIconStyle}
              size={16}
            />
          )}
          {loading ? "Please wait..." : text}
        </Button>
      )}
    </>
  );
};

export default Btn;

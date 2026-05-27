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

// const enum variantEnum {
//   "primary" = "primary",
//   "secondary" = "secondary",
// }

interface Props {
  Icon?: React.ElementType;
  text?: string;
  className?: string;
  variant: "primary" | "secondary" | "outline" | "arrow";
  arrowType?: "right" | "left" | "upright" | "downright";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  /**
   * Disable this button for the read-only viewer role. Use on any
   * create/edit/delete/save action so viewers see it greyed out with a
   * "read-only" tooltip. The backend independently rejects the write.
   */
  disableForViewer?: boolean;
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

  return (
    <>
      {variant === "arrow" ? (
        <div
          className={cn(
            "h-8 w-8 rounded-full bg-white border group-hover:border-0 flex items-center justify-center group hover:bg-emerald-600 relative cursor-pointer transition-all duration-200 hover:shadow-sm",
            className,
          )}
          onClick={onClick}>
          {arrowType === "right" ? (
            <ArrowRight className='h-4 w-4 text-emerald-700 group-hover:text-white' />
          ) : arrowType === "left" ? (
            <ArrowLeft className='h-4 w-4 text-emerald-700 group-hover:text-white' />
          ) : arrowType === "upright" ? (
            <ArrowUpRight className='h-4 w-4 text-emerald-700 group-hover:text-white' />
          ) : arrowType === "downright" ? (
            <ArrowDownRight className='h-4 w-4 text-emerald-700 group-hover:text-white' />
          ) : null}
        </div>
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

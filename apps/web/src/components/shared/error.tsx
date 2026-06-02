"use client";
import React from "react";
import { AlertCircle, RefreshCw, Home, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import CustomButton from "./btn";

interface ErrorProps {
  message?: string;

  title?: string;

  statusCode?: number;

  details?: string;

  onRetry?: () => void;

  onGoHome?: () => void;

  showRetry?: boolean;

  showHome?: boolean;

  className?: string;

  variant?: "default" | "minimal" | "inline";

  showDetails?: boolean;
}

const Error = ({
  message = "Something went wrong. Please try again later.",
  title,
  statusCode,
  details,
  onRetry,
  onGoHome,
  showRetry = true,
  showHome = false,
  className,
  variant = "default",
  showDetails = false,
}: ErrorProps) => {
  const errorTitle = title || getErrorTitle(statusCode);

  if (variant === "minimal") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-red-600 text-sm",
          className,
        )}>
        <XCircle className='size-4 shrink-0' />
        <span>{message}</span>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-md bg-red-50 border border-red-200",
          className,
        )}>
        <AlertCircle className='size-5 text-red-600 shrink-0 mt-0.5' />
        <div className='flex-1 min-w-0'>
          {errorTitle && (
            <h4 className='text-sm font-semibold text-red-900 mb-1'>
              {errorTitle}
            </h4>
          )}
          <p className='text-sm text-red-700'>{message}</p>
          {showDetails && details && (
            <details className='mt-2'>
              <summary className='text-xs text-red-600 cursor-pointer hover:text-red-800'>
                Technical Details
              </summary>
              <pre className='mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto'>
                {details}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[400px] p-6",
        className,
      )}>
      <div className='max-w-md w-full text-center'>
        <div className='flex justify-center mb-4'>
          <div className='relative'>
            <div className='absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50' />
            <div className='relative bg-red-50 rounded-full p-3 border border-red-200'>
              <AlertCircle className='size-10 text-red-600' />
            </div>
          </div>
        </div>

        {statusCode && (
          <div className='text-6xl font-bold text-red-600 mb-2 opacity-20'>
            {statusCode}
          </div>
        )}

        <h2 className='text-xl font-semibold text-gray-900 mb-2'>
          {errorTitle}
        </h2>

        <p className='text-gray-600 mb-6 leading-relaxed'>{message}</p>

        {showDetails && details && (
          <details className='mb-6 text-left'>
            <summary className='text-sm text-gray-500 cursor-pointer hover:text-gray-700 mb-2'>
              Show technical details
            </summary>
            <div className='bg-gray-50 border border-gray-200 rounded-md p-4 overflow-x-auto'>
              <pre className='text-xs text-gray-700 whitespace-pre-wrap'>
                {details}
              </pre>
            </div>
          </details>
        )}

        <div className='flex items-center justify-center gap-3'>
          {showRetry && onRetry && (
            <CustomButton
              variant='primary'
              text='Try Again'
              Icon={RefreshCw}
              onClick={onRetry}
              className='px-6'
            />
          )}

          {showHome && onGoHome && (
            <CustomButton
              variant='outline'
              text='Go Home'
              Icon={Home}
              onClick={onGoHome}
              className='px-6'
            />
          )}
        </div>
      </div>
    </div>
  );
};

function getErrorTitle(statusCode?: number): string {
  if (!statusCode) return "Error Occurred";

  const errorTitles: Record<number, string> = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    408: "Request Timeout",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };

  return errorTitles[statusCode] || `Error ${statusCode}`;
}

export default Error;

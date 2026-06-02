"use client";
import { useCallback } from "react";
import toast from "react-hot-toast";
import {
  parseApiError,
  getFieldErrors,
  hasValidationErrors,
  requiresReauthentication,
  type ParsedApiError,
} from "@pkg/trpc/errors";

export interface UseApiErrorOptions {
  showToast?: boolean;

  onValidationError?: (fieldErrors: Record<string, string>) => void;

  onAuthError?: () => void;

  onNetworkError?: () => void;

  onError?: (error: ParsedApiError) => void;
  customMessage?: string;
}

export function useApiError(defaultOptions?: UseApiErrorOptions) {
  const handleError = useCallback(
    (error: unknown, options?: UseApiErrorOptions): ParsedApiError => {
      const opts = { ...defaultOptions, ...options };
      const parsed = parseApiError(error);

      if (requiresReauthentication(parsed)) {
        if (opts.onAuthError) {
          opts.onAuthError();
        }
        if (opts.showToast !== false) {
          toast.error(opts.customMessage || parsed.message);
        }
        return parsed;
      }

      if (parsed.isNetworkError) {
        if (opts.onNetworkError) {
          opts.onNetworkError();
        }
        if (opts.showToast !== false) {
          toast.error(
            opts.customMessage || "Network error. Please check your connection."
          );
        }
        return parsed;
      }

      if (hasValidationErrors(parsed) && opts.onValidationError) {
        const fieldErrors = getFieldErrors(parsed.validationErrors);
        opts.onValidationError(fieldErrors);
      }

      if (opts.onError) {
        opts.onError(parsed);
      }

      if (opts.showToast !== false) {
        toast.error(opts.customMessage || parsed.message);
      }

      return parsed;
    },
    [defaultOptions]
  );

  const handleMutationError = useCallback(
    (
      optionsOrError?: UseApiErrorOptions | unknown,
      maybeOptions?: UseApiErrorOptions
    ): ((error: unknown) => void) | void => {
      if (
        optionsOrError &&
        typeof optionsOrError === "object" &&
        "message" in optionsOrError
      ) {
        handleError(optionsOrError, maybeOptions);
        return;
      }

      return (error: unknown) => {
        handleError(error, optionsOrError as UseApiErrorOptions);
      };
    },
    [handleError]
  );

  const createToastHandler = useCallback(
    (customMessage?: string) => {
      return (error: unknown) => {
        handleError(error, { showToast: true, customMessage });
      };
    },
    [handleError]
  );

  return {
    handleError,
    handleMutationError,
    createToastHandler,
    parseApiError,
    getFieldErrors,
    hasValidationErrors,
    requiresReauthentication,
  };
}

export default useApiError;

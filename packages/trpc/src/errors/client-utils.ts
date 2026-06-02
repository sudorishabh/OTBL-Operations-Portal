import type { ErrorCodeType } from "./error-codes";

export interface ClientValidationError {
  field: string;
  message: string;
}

export interface ParsedApiError {
  code: ErrorCodeType | string;
  message: string;
  validationErrors?: ClientValidationError[];
  requestId?: string;
  timestamp?: string;
  httpStatus?: number;
  isNetworkError: boolean;
  originalError: unknown;
}

interface TRPCClientErrorLike {
  data?: {
    errorCode?: string;
    userMessage?: string;
    validationErrors?: ClientValidationError[];
    requestId?: string;
    timestamp?: string;
    httpStatus?: number;
    code?: string;
  };
  message?: string;
  name?: string;
}

function isTRPCClientErrorLike(error: unknown): error is TRPCClientErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    (error as any).name === "TRPCClientError"
  );
}

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

const NETWORK_ERROR_MESSAGE =
  "Unable to connect to the server. Please check your internet connection.";

export function parseApiError(error: unknown): ParsedApiError {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      code: "NETWORK_ERROR",
      message: NETWORK_ERROR_MESSAGE,
      isNetworkError: true,
      originalError: error,
    };
  }

  if (isTRPCClientErrorLike(error)) {
    const data = error.data;

    return {
      code: data?.errorCode || data?.code || "UNKNOWN_ERROR",
      message: data?.userMessage || error.message || DEFAULT_ERROR_MESSAGE,
      validationErrors: data?.validationErrors,
      requestId: data?.requestId,
      timestamp: data?.timestamp,
      httpStatus: data?.httpStatus,
      isNetworkError: false,
      originalError: error,
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message || DEFAULT_ERROR_MESSAGE,
      isNetworkError: false,
      originalError: error,
    };
  }

  if (typeof error === "string") {
    return {
      code: "UNKNOWN_ERROR",
      message: error || DEFAULT_ERROR_MESSAGE,
      isNetworkError: false,
      originalError: error,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: DEFAULT_ERROR_MESSAGE,
    isNetworkError: false,
    originalError: error,
  };
}

export function getFieldErrors(
  errors?: ClientValidationError[]
): Record<string, string> {
  if (!errors) return {};

  return errors.reduce(
    (acc, error) => {
      acc[error.field] = error.message;
      return acc;
    },
    {} as Record<string, string>
  );
}

export function getFieldError(
  errors: ClientValidationError[] | undefined,
  fieldName: string
): string | undefined {
  return errors?.find((e) => e.field === fieldName)?.message;
}

export function hasValidationErrors(error: ParsedApiError): boolean {
  return (error.validationErrors?.length ?? 0) > 0;
}

export function isValidationErrorResponse(error: ParsedApiError): boolean {
  return (
    error.code.startsWith("VALIDATION_") ||
    (error.validationErrors?.length ?? 0) > 0
  );
}

export function isAuthErrorResponse(error: ParsedApiError): boolean {
  return (
    error.code.startsWith("AUTH_") ||
    error.httpStatus === 401 ||
    error.httpStatus === 403
  );
}

export function requiresReauthentication(error: ParsedApiError): boolean {
  return (
    error.code === "AUTH_SESSION_EXPIRED" ||
    error.code === "AUTH_TOKEN_EXPIRED" ||
    error.code === "AUTH_TOKEN_INVALID" ||
    error.code === "AUTH_UNAUTHORIZED"
  );
}

export function isNotFoundError(error: ParsedApiError): boolean {
  return error.code === "RESOURCE_NOT_FOUND" || error.httpStatus === 404;
}

export function isServerError(error: ParsedApiError): boolean {
  return (error.httpStatus ?? 0) >= 500;
}

export function getErrorTitle(error: ParsedApiError): string {
  if (error.isNetworkError) return "Connection Error";
  if (isValidationErrorResponse(error)) return "Validation Error";
  if (isAuthErrorResponse(error)) return "Authentication Required";
  if (isNotFoundError(error)) return "Not Found";
  if (isServerError(error)) return "Server Error";
  return "Error";
}

export function formatSupportMessage(error: ParsedApiError): string {
  const lines = [
    `Error Code: ${error.code}`,
    `Message: ${error.message}`,
    `Timestamp: ${error.timestamp || new Date().toISOString()}`,
  ];

  if (error.requestId) {
    lines.push(`Request ID: ${error.requestId}`);
  }

  return lines.join("\n");
}

export interface MutationErrorHandlerOptions {
  showError?: (message: string, title?: string) => void;
  setFormErrors?: (errors: Record<string, string>) => void;
  onErrorCode?: Partial<Record<string, (error: ParsedApiError) => void>>;
  onAuthError?: (error: ParsedApiError) => void;
  onServerError?: (error: ParsedApiError) => void;
}

export function createMutationErrorHandler(
  options: MutationErrorHandlerOptions
): (error: unknown) => void {
  return (error: unknown) => {
    const parsed = parseApiError(error);

    const customHandler = options.onErrorCode?.[parsed.code];
    if (customHandler) {
      customHandler(parsed);
      return;
    }

    if (requiresReauthentication(parsed) && options.onAuthError) {
      options.onAuthError(parsed);
      return;
    }

    if (isServerError(parsed) && options.onServerError) {
      options.onServerError(parsed);
    }

    if (hasValidationErrors(parsed) && options.setFormErrors) {
      options.setFormErrors(getFieldErrors(parsed.validationErrors));
    }

    if (options.showError) {
      options.showError(parsed.message, getErrorTitle(parsed));
    }
  };
}

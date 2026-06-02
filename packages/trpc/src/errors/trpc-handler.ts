import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import {
  AppError,
  type ValidationFieldError,
  type ErrorMetadata,
} from "./app-error";
import { ErrorCode, type ErrorCodeType } from "./error-codes";
import { GENERIC_ERROR_MESSAGE } from "./user-messages";

type TRPCErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "TIMEOUT"
  | "CONFLICT"
  | "PRECONDITION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "METHOD_NOT_SUPPORTED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UNPROCESSABLE_CONTENT"
  | "TOO_MANY_REQUESTS"
  | "CLIENT_CLOSED_REQUEST"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_IMPLEMENTED"
  | "BAD_GATEWAY"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT";

function httpStatusToTRPCCode(status: number): TRPCErrorCode {
  const mapping: Record<number, TRPCErrorCode> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    408: "TIMEOUT",
    409: "CONFLICT",
    410: "NOT_FOUND",
    412: "PRECONDITION_FAILED",
    413: "PAYLOAD_TOO_LARGE",
    415: "UNSUPPORTED_MEDIA_TYPE",
    422: "UNPROCESSABLE_CONTENT",
    423: "FORBIDDEN",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_SERVER_ERROR",
    502: "BAD_GATEWAY",
    503: "SERVICE_UNAVAILABLE",
    504: "GATEWAY_TIMEOUT",
  };

  return mapping[status] || "INTERNAL_SERVER_ERROR";
}

export interface TRPCErrorCause {
  errorCode: ErrorCodeType;
  userMessage: string;
  devMessage: string;
  httpStatus: number;
  validationErrors?: ValidationFieldError[];
  metadata?: ErrorMetadata;
  timestamp: string;
}

export function appErrorToTRPCError(error: AppError): TRPCError {
  const cause: TRPCErrorCause = {
    errorCode: error.code,
    userMessage: error.userMessage,
    devMessage: error.devMessage,
    httpStatus: error.httpStatus,
    validationErrors: error.validationErrors,
    metadata: error.metadata,
    timestamp: error.timestamp,
  };

  return new TRPCError({
    code: httpStatusToTRPCCode(error.httpStatus),
    message: error.userMessage,
    cause,
  });
}

export function zodErrorToAppError(error: ZodError): AppError {
  const validationErrors: ValidationFieldError[] = error.issues.map(
    (issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      rule: issue.code,
    })
  );

  return new AppError({
    code: ErrorCode.INVALID_INPUT,
    devMessage: `Validation failed: ${error.issues.length} error(s)`,
    userMessage: "Please check the form for errors and try again.",
    validationErrors,
    cause: error,
  });
}

export function transformToTRPCError(error: unknown): TRPCError {
  if (error instanceof TRPCError) {
    if (
      error.cause &&
      typeof error.cause === "object" &&
      "errorCode" in error.cause
    ) {
      return error;
    }

    const cause: TRPCErrorCause = {
      errorCode: trcpCodeToAppErrorCode(error.code),
      userMessage: error.message,
      devMessage: error.message,
      httpStatus: trcpCodeToHttpStatus(error.code),
      timestamp: new Date().toISOString(),
    };

    return new TRPCError({
      code: error.code,
      message: error.message,
      cause,
    });
  }

  if (error instanceof AppError) {
    return appErrorToTRPCError(error);
  }

  if (error instanceof ZodError) {
    return appErrorToTRPCError(zodErrorToAppError(error));
  }

  if (error instanceof Error) {
    if (
      error.message.includes("duplicate key") ||
      error.message.includes("unique constraint") ||
      error.message.includes("Duplicate entry")
    ) {
      const appError = new AppError({
        code: ErrorCode.DUPLICATE_ENTRY,
        devMessage: error.message,
        cause: error,
      });
      return appErrorToTRPCError(appError);
    }

    if (error.message.includes("foreign key")) {
      const appError = new AppError({
        code: ErrorCode.INVALID_REFERENCE,
        devMessage: error.message,
        cause: error,
      });
      return appErrorToTRPCError(appError);
    }

    if (
      error.message.includes("not null") ||
      error.message.includes("NOT NULL")
    ) {
      const appError = new AppError({
        code: ErrorCode.REQUIRED_FIELD_MISSING,
        devMessage: error.message,
        cause: error,
      });
      return appErrorToTRPCError(appError);
    }

    const appError = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      devMessage: error.message,
      userMessage: GENERIC_ERROR_MESSAGE,
      cause: error,
    });
    return appErrorToTRPCError(appError);
  }

  const appError = new AppError({
    code: ErrorCode.UNEXPECTED_ERROR,
    devMessage: String(error),
    userMessage: GENERIC_ERROR_MESSAGE,
    cause: error,
  });
  return appErrorToTRPCError(appError);
}

function trcpCodeToAppErrorCode(code: string): ErrorCodeType {
  const mapping: Record<string, ErrorCodeType> = {
    BAD_REQUEST: ErrorCode.INVALID_INPUT,
    UNAUTHORIZED: ErrorCode.UNAUTHORIZED,
    FORBIDDEN: ErrorCode.FORBIDDEN,
    NOT_FOUND: ErrorCode.NOT_FOUND,
    TIMEOUT: ErrorCode.TIMEOUT,
    CONFLICT: ErrorCode.ALREADY_EXISTS,
    PRECONDITION_FAILED: ErrorCode.PRECONDITION_FAILED,
    PAYLOAD_TOO_LARGE: ErrorCode.FILE_TOO_LARGE,
    TOO_MANY_REQUESTS: ErrorCode.TOO_MANY_ATTEMPTS,
    INTERNAL_SERVER_ERROR: ErrorCode.INTERNAL_ERROR,
    SERVICE_UNAVAILABLE: ErrorCode.SERVICE_UNAVAILABLE,
    GATEWAY_TIMEOUT: ErrorCode.TIMEOUT,
    PARSE_ERROR: ErrorCode.INVALID_INPUT,
  };

  return mapping[code] || ErrorCode.INTERNAL_ERROR;
}

function trcpCodeToHttpStatus(code: string): number {
  const mapping: Record<string, number> = {
    PARSE_ERROR: 400,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TIMEOUT: 408,
    CONFLICT: 409,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    UNPROCESSABLE_CONTENT: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  };

  return mapping[code] || 500;
}

export function formatErrorForClient({
  shape,
  error,
}: {
  shape: any;
  error: TRPCError;
}): any {
  const cause = error.cause as TRPCErrorCause | undefined;

  const isDev = process.env.NODE_ENV !== "production";

  return {
    ...shape,
    data: {
      ...shape.data,
      code: shape.data.code,
      httpStatus: shape.data.httpStatus,

      errorCode: cause?.errorCode || "SYSTEM_INTERNAL_ERROR",
      userMessage: cause?.userMessage || error.message,
      validationErrors: cause?.validationErrors,
      requestId: cause?.metadata?.requestId,
      timestamp: cause?.timestamp || new Date().toISOString(),

      ...(isDev && {
        devMessage: cause?.devMessage,
        stack: error.stack,
        metadata: cause?.metadata,
      }),
    },
  };
}

export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = "Database operation failed",
  metadata?: ErrorMetadata
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error("Database operation error:", error);

    const trpcError = transformToTRPCError(error);

    if (error instanceof TRPCError || error instanceof AppError) {
      throw trpcError;
    }

    const appError = new AppError({
      code: ErrorCode.DATABASE_ERROR,
      devMessage:
        errorMessage + (error instanceof Error ? `: ${error.message}` : ""),
      userMessage: "We're having trouble accessing the data. Please try again.",
      metadata,
      cause: error,
    });

    throw appErrorToTRPCError(appError);
  }
}

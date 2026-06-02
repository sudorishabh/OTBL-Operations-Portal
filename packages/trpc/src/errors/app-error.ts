import { type ErrorCodeType, ErrorCodeHttpStatus } from "./error-codes";
import { getUserMessage } from "./user-messages";

export interface ValidationFieldError {
  field: string;
  message: string;
  value?: unknown;
  rule?: string;
}

export interface ErrorMetadata {
  requestId?: string;
  timestamp?: string;
  durationMs?: number;
  path?: string;
  method?: string;
  userId?: string;
  sessionId?: string;
  resourceType?: string;
  resourceId?: string | number;
  [key: string]: unknown;
}

export interface ErrorDetails {
  code: ErrorCodeType;
  httpStatus: number;
  userMessage: string;
  devMessage: string;
  validationErrors?: ValidationFieldError[];
  metadata?: ErrorMetadata;
  stack?: string;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCodeType;
  readonly httpStatus: number;
  readonly userMessage: string;
  readonly devMessage: string;
  readonly validationErrors?: ValidationFieldError[];
  readonly metadata?: ErrorMetadata;
  readonly originalError?: unknown;
  readonly timestamp: string;

  constructor(options: {
    code: ErrorCodeType;
    devMessage: string;
    userMessage?: string;
    validationErrors?: ValidationFieldError[];
    metadata?: ErrorMetadata;
    cause?: unknown;
  }) {
    const userMessage = options.userMessage || getUserMessage(options.code);

    super(options.devMessage);

    this.name = "AppError";
    this.code = options.code;
    this.httpStatus = ErrorCodeHttpStatus[options.code];
    this.userMessage = userMessage;
    this.devMessage = options.devMessage;
    this.validationErrors = options.validationErrors;
    this.metadata = options.metadata;
    this.originalError = options.cause;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    if (options.cause instanceof Error && options.cause.stack) {
      this.stack = `${this.stack}\n\nCaused by:\n${options.cause.stack}`;
    }
  }

  toLogObject(): ErrorDetails {
    return {
      code: this.code,
      httpStatus: this.httpStatus,
      userMessage: this.userMessage,
      devMessage: this.devMessage,
      validationErrors: this.validationErrors,
      metadata: {
        ...this.metadata,
        timestamp: this.timestamp,
      },
      stack: this.stack,
      cause:
        this.originalError instanceof Error
          ? {
              name: this.originalError.name,
              message: this.originalError.message,
              stack: this.originalError.stack,
            }
          : this.originalError,
    };
  }

  toClientResponse(): {
    code: ErrorCodeType;
    message: string;
    validationErrors?: ValidationFieldError[];
    requestId?: string;
    timestamp: string;
  } {
    return {
      code: this.code,
      message: this.userMessage,
      validationErrors: this.validationErrors,
      requestId: this.metadata?.requestId,
      timestamp: this.timestamp,
    };
  }

  isClientError(): boolean {
    return this.httpStatus >= 400 && this.httpStatus < 500;
  }

  isServerError(): boolean {
    return this.httpStatus >= 500;
  }

  shouldLogAsError(): boolean {
    return this.isServerError();
  }

  static fromUnknown(error: unknown, defaultCode?: ErrorCodeType): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const code = defaultCode || "SYSTEM_UNEXPECTED_ERROR";

    if (error instanceof Error) {
      return new AppError({
        code,
        devMessage: error.message,
        cause: error,
      });
    }

    if (typeof error === "string") {
      return new AppError({
        code,
        devMessage: error,
      });
    }

    return new AppError({
      code,
      devMessage: `Unknown error: ${String(error)}`,
      cause: error,
    });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isAppErrorLike(
  error: unknown
): error is { code: ErrorCodeType; userMessage: string; devMessage: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "userMessage" in error
  );
}

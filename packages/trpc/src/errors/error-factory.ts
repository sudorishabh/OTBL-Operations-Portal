import { ErrorCode, type ErrorCodeType } from "./error-codes";
import {
  AppError,
  type ErrorMetadata,
  type ValidationFieldError,
} from "./app-error";

export interface ErrorOptions {
  userMessage?: string;
  devMessage?: string;
  metadata?: ErrorMetadata;
  cause?: unknown;
  validationErrors?: ValidationFieldError[];
}

const MYSQL_ERROR_CODES = {
  ER_DUP_ENTRY: 1062,
  ER_DUP_KEY: 1022,
  ER_NO_REFERENCED_ROW: 1216,
  ER_NO_REFERENCED_ROW_2: 1452,
  ER_ROW_IS_REFERENCED: 1217,
  ER_ROW_IS_REFERENCED_2: 1451,
  ER_TRUNCATED_WRONG_VALUE: 1292,
  ER_DATA_TOO_LONG: 1406,
  ER_BAD_NULL_ERROR: 1048,
  ER_WRONG_VALUE_COUNT: 1136,
  ER_CON_COUNT_ERROR: 1040,
  ER_HOST_IS_BLOCKED: 1129,
  ER_HOST_NOT_PRIVILEGED: 1130,
  ER_ACCESS_DENIED_ERROR: 1045,
  ER_DBACCESS_DENIED_ERROR: 1044,
  ER_PARSE_ERROR: 1064,
  ER_WRONG_VALUE_FOR_TYPE: 1411,
  ER_NO_SUCH_TABLE: 1146,
  ER_TABLE_EXISTS_ERROR: 1050,
  ER_LOCK_WAIT_TIMEOUT: 1205,
  ER_LOCK_DEADLOCK: 1213,
  ER_KEY_NOT_FOUND: 1032,
} as const;

export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function createError(
  code: ErrorCodeType,
  messageOrOptions?: string | ErrorOptions,
): AppError {
  const options =
    typeof messageOrOptions === "string"
      ? { userMessage: messageOrOptions }
      : messageOrOptions || {};

  return new AppError({
    code,
    devMessage:
      options.devMessage || options.userMessage || "An error occurred",
    userMessage: options.userMessage,
    metadata: options.metadata,
    cause: options.cause,
    validationErrors: options.validationErrors,
  });
}

interface MySQLError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  sql?: string;
}

export function fromDatabaseError(error: unknown, context?: string): AppError {
  const mysqlError = error as MySQLError;
  const contextPrefix = context ? `${context}: ` : "";

  if (mysqlError.errno || mysqlError.code) {
    const errno = mysqlError.errno;
    const code = mysqlError.code;

    if (
      errno === MYSQL_ERROR_CODES.ER_DUP_ENTRY ||
      errno === MYSQL_ERROR_CODES.ER_DUP_KEY ||
      code === "ER_DUP_ENTRY"
    ) {
      const match = mysqlError.message?.match(
        /Duplicate entry '([^']+)' for key '([^']+)'/,
      );
      const value = match?.[1];
      const key = match?.[2];

      return new AppError({
        code: ErrorCode.DUPLICATE_ENTRY,
        devMessage: `${contextPrefix}${mysqlError.message}`,
        userMessage: key
          ? `A record with this ${key.replace(/_/g, " ")} already exists.`
          : "This record already exists. Please use unique values.",
        validationErrors: key
          ? [{ field: key, message: "This value is already in use", value }]
          : undefined,
        cause: error,
      });
    }

    if (
      errno === MYSQL_ERROR_CODES.ER_NO_REFERENCED_ROW ||
      errno === MYSQL_ERROR_CODES.ER_NO_REFERENCED_ROW_2
    ) {
      return new AppError({
        code: ErrorCode.REFERENCE_NOT_FOUND,
        devMessage: `${contextPrefix}${mysqlError.message}`,
        userMessage:
          "The selected reference does not exist. Please choose a valid option.",
        cause: error,
      });
    }

    if (
      errno === MYSQL_ERROR_CODES.ER_ROW_IS_REFERENCED ||
      errno === MYSQL_ERROR_CODES.ER_ROW_IS_REFERENCED_2
    ) {
      return new AppError({
        code: ErrorCode.IN_USE,
        devMessage: `${contextPrefix}${mysqlError.message}`,
        userMessage:
          "This record cannot be deleted because it is being used elsewhere.",
        cause: error,
      });
    }

    if (errno === MYSQL_ERROR_CODES.ER_DATA_TOO_LONG) {
      const match = mysqlError.message?.match(/column '([^']+)'/);
      const field = match?.[1];

      return new AppError({
        code: ErrorCode.STRING_TOO_LONG,
        devMessage: `${contextPrefix}${mysqlError.message}`,
        userMessage: field
          ? `The value for ${field.replace(/_/g, " ")} is too long.`
          : "One of the values you entered is too long.",
        validationErrors: field
          ? [{ field, message: "Value is too long" }]
          : undefined,
        cause: error,
      });
    }

    if (errno === MYSQL_ERROR_CODES.ER_BAD_NULL_ERROR) {
      const match = mysqlError.message?.match(/Column '([^']+)'/);
      const field = match?.[1];

      return new AppError({
        code: ErrorCode.REQUIRED_FIELD_MISSING,
        devMessage: `${contextPrefix}${mysqlError.message}`,
        userMessage: field
          ? `${field.replace(/_/g, " ")} is required.`
          : "A required field is missing.",
        validationErrors: field
          ? [{ field, message: "This field is required" }]
          : undefined,
        cause: error,
      });
    }

    if (
      errno === MYSQL_ERROR_CODES.ER_TRUNCATED_WRONG_VALUE ||
      errno === MYSQL_ERROR_CODES.ER_WRONG_VALUE_FOR_TYPE
    ) {
      return new AppError({
        code: ErrorCode.INVALID_FORMAT,
        devMessage: `${contextPrefix}${mysqlError.message}`,
        userMessage:
          "One of the values has an invalid format. Please check your input.",
        cause: error,
      });
    }

    if (errno === MYSQL_ERROR_CODES.ER_LOCK_DEADLOCK) {
      return new AppError({
        code: ErrorCode.DATABASE_ERROR,
        devMessage: `${contextPrefix}Deadlock detected: ${mysqlError.message}`,
        userMessage: "The server is busy. Please try again in a moment.",
        cause: error,
      });
    }

    if (errno === MYSQL_ERROR_CODES.ER_LOCK_WAIT_TIMEOUT) {
      return new AppError({
        code: ErrorCode.DATABASE_TIMEOUT,
        devMessage: `${contextPrefix}Lock wait timeout: ${mysqlError.message}`,
        userMessage: "The operation timed out. Please try again.",
        cause: error,
      });
    }

    if (
      errno === MYSQL_ERROR_CODES.ER_CON_COUNT_ERROR ||
      errno === MYSQL_ERROR_CODES.ER_HOST_IS_BLOCKED
    ) {
      return new AppError({
        code: ErrorCode.DATABASE_CONNECTION_FAILED,
        devMessage: `${contextPrefix}Connection error: ${mysqlError.message}`,
        userMessage:
          "We're experiencing connection issues. Please try again later.",
        cause: error,
      });
    }

    if (
      errno === MYSQL_ERROR_CODES.ER_ACCESS_DENIED_ERROR ||
      errno === MYSQL_ERROR_CODES.ER_DBACCESS_DENIED_ERROR
    ) {
      return new AppError({
        code: ErrorCode.DATABASE_ERROR,
        devMessage: `${contextPrefix}Access denied: ${mysqlError.message}`,
        userMessage: "Database access error. Please contact support.",
        cause: error,
      });
    }

    if (errno === MYSQL_ERROR_CODES.ER_NO_SUCH_TABLE) {
      return new AppError({
        code: ErrorCode.DATABASE_ERROR,
        devMessage: `${contextPrefix}Table not found: ${mysqlError.message}`,
        userMessage: "Database configuration error. Please contact support.",
        cause: error,
      });
    }
  }

  const errorMessage = mysqlError.message || String(error);

  if (
    errorMessage.includes("duplicate key") ||
    errorMessage.includes("unique constraint") ||
    errorMessage.includes("Duplicate entry")
  ) {
    return new AppError({
      code: ErrorCode.DUPLICATE_ENTRY,
      devMessage: `${contextPrefix}${errorMessage}`,
      userMessage: "This record already exists.",
      cause: error,
    });
  }

  if (errorMessage.includes("foreign key")) {
    return new AppError({
      code: ErrorCode.INVALID_REFERENCE,
      devMessage: `${contextPrefix}${errorMessage}`,
      userMessage: "Invalid reference. The related record may not exist.",
      cause: error,
    });
  }

  if (errorMessage.includes("not null") || errorMessage.includes("NOT NULL")) {
    return new AppError({
      code: ErrorCode.REQUIRED_FIELD_MISSING,
      devMessage: `${contextPrefix}${errorMessage}`,
      userMessage: "A required field is missing.",
      cause: error,
    });
  }

  if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
    return new AppError({
      code: ErrorCode.DATABASE_TIMEOUT,
      devMessage: `${contextPrefix}${errorMessage}`,
      userMessage: "The operation timed out. Please try again.",
      cause: error,
    });
  }

  if (
    errorMessage.includes("ECONNREFUSED") ||
    errorMessage.includes("connection refused") ||
    errorMessage.includes("ENOTFOUND")
  ) {
    return new AppError({
      code: ErrorCode.DATABASE_CONNECTION_FAILED,
      devMessage: `${contextPrefix}${errorMessage}`,
      userMessage: "Unable to connect to the database. Please try again later.",
      cause: error,
    });
  }

  return new AppError({
    code: ErrorCode.DATABASE_ERROR,
    devMessage: `${contextPrefix}${errorMessage}`,
    userMessage:
      "A database error occurred. Please try again or contact support.",
    cause: error,
  });
}

export function notFound(
  resource: string,
  resourceId?: string | number,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.NOT_FOUND,
    devMessage:
      options?.devMessage ||
      `${resource}${resourceId !== undefined ? ` (ID: ${resourceId})` : ""} not found`,
    userMessage:
      options?.userMessage ||
      `The ${resource.toLowerCase()} you're looking for doesn't exist or has been removed.`,
    metadata: {
      ...options?.metadata,
      resourceType: resource,
      resourceId,
    },
    cause: options?.cause,
  });
}

export function alreadyExists(
  resource: string,
  identifier?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.ALREADY_EXISTS,
    devMessage:
      options?.devMessage ||
      `${resource}${identifier ? ` "${identifier}"` : ""} already exists`,
    userMessage:
      options?.userMessage ||
      `A ${resource.toLowerCase()} with this information already exists.`,
    metadata: {
      ...options?.metadata,
      resourceType: resource,
      identifier,
    },
    cause: options?.cause,
  });
}

export function validationError(
  message: string,
  fields?: ValidationFieldError[],
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.INVALID_INPUT,
    devMessage: options?.devMessage || message,
    userMessage:
      options?.userMessage || "Please check your input and try again.",
    validationErrors: fields,
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function unauthorized(
  message?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.UNAUTHORIZED,
    devMessage: options?.devMessage || message || "User is not authenticated",
    userMessage:
      options?.userMessage || message || "Please log in to continue.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function forbidden(action?: string, options?: ErrorOptions): AppError {
  return new AppError({
    code: ErrorCode.FORBIDDEN,
    devMessage:
      options?.devMessage ||
      (action
        ? `User does not have permission to ${action}`
        : "User does not have permission for this action"),
    userMessage:
      options?.userMessage ||
      "You don't have permission to perform this action.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function insufficientPermissions(
  requiredRole?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.INSUFFICIENT_PERMISSIONS,
    devMessage:
      options?.devMessage ||
      (requiredRole
        ? `Insufficient permissions. Required role: ${requiredRole}`
        : "Insufficient permissions"),
    userMessage:
      options?.userMessage ||
      "Your current role doesn't have permission for this action. Contact your administrator if you need access.",
    metadata: {
      ...options?.metadata,
      requiredRole,
    },
    cause: options?.cause,
  });
}

export function businessRule(
  message: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.RULE_VIOLATION,
    devMessage: options?.devMessage || message,
    userMessage:
      options?.userMessage ||
      "This action cannot be completed due to business rules.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function operationNotAllowed(
  message: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.OPERATION_NOT_ALLOWED,
    devMessage: options?.devMessage || message,
    userMessage:
      options?.userMessage ||
      "This operation cannot be performed at this time.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function invalidStateTransition(
  fromState: string,
  toState: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.STATE_TRANSITION_NOT_ALLOWED,
    devMessage:
      options?.devMessage ||
      `Invalid state transition from "${fromState}" to "${toState}"`,
    userMessage:
      options?.userMessage ||
      `Cannot change status from ${fromState} to ${toState}.`,
    metadata: {
      ...options?.metadata,
      fromState,
      toState,
    },
    cause: options?.cause,
  });
}

export function internal(
  devMessage?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.INTERNAL_ERROR,
    devMessage: devMessage || options?.devMessage || "Internal server error",
    userMessage:
      options?.userMessage ||
      "Something went wrong on our end. Please try again later.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function fromUnknown(error: unknown, context?: string): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    const message = context ? `${context}: ${error.message}` : error.message;
    return new AppError({
      code: ErrorCode.UNEXPECTED_ERROR,
      devMessage: message,
      userMessage: "An unexpected error occurred. Please try again later.",
      cause: error,
    });
  }

  if (typeof error === "string") {
    const message = context ? `${context}: ${error}` : error;
    return new AppError({
      code: ErrorCode.UNEXPECTED_ERROR,
      devMessage: message,
      userMessage: "An unexpected error occurred. Please try again later.",
    });
  }

  return new AppError({
    code: ErrorCode.UNEXPECTED_ERROR,
    devMessage: context || "Unknown error occurred",
    userMessage: "An unexpected error occurred. Please try again later.",
    cause: error,
  });
}

export function fileError(
  type: "too_large" | "invalid_type" | "upload_failed",
  fileName?: string,
  sizeMB?: number,
  options?: ErrorOptions,
): AppError {
  const codes = {
    too_large: ErrorCode.FILE_TOO_LARGE,
    invalid_type: ErrorCode.INVALID_FILE_TYPE,
    upload_failed: ErrorCode.FILE_UPLOAD_FAILED,
  };

  const messages = {
    too_large: {
      dev: `File ${fileName || "unknown"} is too large (${sizeMB}MB)`,
      user: `The file is too large. Maximum size allowed is ${sizeMB || 10}MB.`,
    },
    invalid_type: {
      dev: `Invalid file type for ${fileName || "file"}`,
      user: "This file type is not allowed. Please upload a different format.",
    },
    upload_failed: {
      dev: `Failed to upload file: ${fileName || "unknown"}`,
      user: "Failed to upload the file. Please try again.",
    },
  };

  return new AppError({
    code: codes[type],
    devMessage: options?.devMessage || messages[type].dev,
    userMessage: options?.userMessage || messages[type].user,
    metadata: {
      ...options?.metadata,
      fileName,
      sizeMB,
    },
    cause: options?.cause,
  });
}

export function serviceUnavailable(
  serviceName: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.SERVICE_UNAVAILABLE,
    devMessage:
      options?.devMessage || `External service "${serviceName}" is unavailable`,
    userMessage:
      options?.userMessage ||
      "The service is temporarily unavailable. Please try again later.",
    metadata: {
      ...options?.metadata,
      serviceName,
    },
    cause: options?.cause,
  });
}

export function timeout(operation?: string, options?: ErrorOptions): AppError {
  return new AppError({
    code: ErrorCode.TIMEOUT,
    devMessage:
      options?.devMessage ||
      `Operation timed out${operation ? `: ${operation}` : ""}`,
    userMessage:
      options?.userMessage || "The operation took too long. Please try again.",
    metadata: {
      ...options?.metadata,
      operation,
    },
    cause: options?.cause,
  });
}

export function rateLimited(
  retryAfterSeconds?: number,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.RATE_LIMITED,
    devMessage:
      options?.devMessage ||
      `Rate limited${retryAfterSeconds ? `. Retry after ${retryAfterSeconds}s` : ""}`,
    userMessage:
      options?.userMessage ||
      "Too many requests. Please wait a moment and try again.",
    metadata: {
      ...options?.metadata,
      retryAfterSeconds,
    },
    cause: options?.cause,
  });
}

export function createUnauthorizedError(
  messageOrOptions?: string | ErrorOptions,
  options?: ErrorOptions,
): AppError {
  if (
    typeof messageOrOptions === "object" &&
    messageOrOptions !== null &&
    !Array.isArray(messageOrOptions)
  ) {
    return unauthorized(messageOrOptions.userMessage, messageOrOptions);
  }
  return unauthorized(
    typeof messageOrOptions === "string"
      ? messageOrOptions
      : options?.userMessage,
    options || {},
  );
}

export function createInternalError(
  messageOrOptions?: string | ErrorOptions,
  options?: ErrorOptions,
): AppError {
  if (
    typeof messageOrOptions === "object" &&
    messageOrOptions !== null &&
    !Array.isArray(messageOrOptions)
  ) {
    return internal(messageOrOptions.devMessage, messageOrOptions);
  }
  return internal(
    typeof messageOrOptions === "string"
      ? messageOrOptions
      : options?.devMessage,
    options || {},
  );
}

export function createForbiddenError(
  messageOrOptions?: string | ErrorOptions,
  options?: ErrorOptions,
): AppError {
  if (
    typeof messageOrOptions === "object" &&
    messageOrOptions !== null &&
    !Array.isArray(messageOrOptions)
  ) {
    return forbidden(undefined, messageOrOptions);
  }
  return forbidden(
    typeof messageOrOptions === "string" ? messageOrOptions : undefined,
    options || {},
  );
}

export function createInsufficientPermissionsError(
  roleOrOptions?: string | ErrorOptions,
  options?: ErrorOptions,
): AppError {
  if (
    typeof roleOrOptions === "object" &&
    roleOrOptions !== null &&
    !Array.isArray(roleOrOptions)
  ) {
    return insufficientPermissions(undefined, roleOrOptions);
  }
  return insufficientPermissions(
    typeof roleOrOptions === "string" ? roleOrOptions : undefined,
    options || {},
  );
}

export const createNotFoundError = notFound;
export const createAlreadyExistsError = alreadyExists;
export const createBusinessRuleError = businessRule;
export const createOperationNotAllowedError = operationNotAllowed;
export const createInvalidStateTransitionError = invalidStateTransition;
export const createUnexpectedError = fromUnknown;
export const createDatabaseError = fromDatabaseError;
export const createServiceUnavailableError = serviceUnavailable;

export function createValidationError(
  messageOrOptions:
    | string
    | (ErrorOptions & { fields?: ValidationFieldError[] }),
  fields?: ValidationFieldError[],
): AppError {
  if (typeof messageOrOptions === "object") {
    return validationError(
      messageOrOptions.devMessage || "Validation failed",
      messageOrOptions.fields || messageOrOptions.validationErrors,
      messageOrOptions,
    );
  }
  return validationError(messageOrOptions, fields);
}

export function createRequiredFieldError(
  fieldName: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.REQUIRED_FIELD_MISSING,
    devMessage:
      options?.devMessage || `Required field "${fieldName}" is missing`,
    userMessage: options?.userMessage || `${fieldName} is required.`,
    validationErrors: [{ field: fieldName, message: "This field is required" }],
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function createInvalidDateRangeError(
  message?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.INVALID_DATE_RANGE,
    devMessage:
      options?.devMessage || message || "End date must be after start date",
    userMessage:
      options?.userMessage ||
      "The end date must be after the start date. Please correct the dates.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function createDuplicateEntryError(
  fieldName: string,
  value?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.DUPLICATE_ENTRY,
    devMessage:
      options?.devMessage ||
      `Duplicate entry for "${fieldName}"${value ? `: "${value}"` : ""}`,
    userMessage:
      options?.userMessage ||
      `This ${fieldName.toLowerCase()} is already in use. Please choose a different one.`,
    validationErrors: [
      { field: fieldName, message: "This value is already in use", value },
    ],
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function createInvalidCredentialsError(
  message?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.INVALID_CREDENTIALS,
    devMessage: options?.devMessage || message || "Invalid email or password",
    userMessage:
      options?.userMessage || "The email or password you entered is incorrect.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function createSessionExpiredError(
  message?: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code: ErrorCode.SESSION_EXPIRED,
    devMessage: options?.devMessage || message || "User session has expired",
    userMessage:
      options?.userMessage || "Your session has expired. Please log in again.",
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function createSharePointError(
  operation: string | "upload" | "download" | "auth" | "permission",
  options?: ErrorOptions,
): AppError {
  const operations = ["upload", "download", "auth", "permission"];
  const isOperation = operations.includes(operation);

  const codeMap: Record<string, ErrorCodeType> = {
    upload: ErrorCode.SHAREPOINT_UPLOAD_FAILED,
    download: ErrorCode.SHAREPOINT_DOWNLOAD_FAILED,
    auth: ErrorCode.SHAREPOINT_AUTH_FAILED,
    permission: ErrorCode.SHAREPOINT_PERMISSION_DENIED,
  };

  const code = isOperation
    ? codeMap[operation]!
    : ErrorCode.SHAREPOINT_UPLOAD_FAILED;

  return new AppError({
    code,
    devMessage:
      options?.devMessage ||
      (isOperation ? `SharePoint ${operation} operation failed` : operation),
    userMessage: options?.userMessage,
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function createResourceError(
  code: ErrorCodeType,
  message: string,
  options?: ErrorOptions,
): AppError {
  return new AppError({
    code,
    devMessage: options?.devMessage || message,
    userMessage: options?.userMessage,
    metadata: options?.metadata,
    cause: options?.cause,
  });
}

export function throwNotFoundError(
  resource: string,
  resourceId?: string | number,
  options?: ErrorOptions,
): never {
  throw notFound(resource, resourceId, options);
}

export function throwValidationError(
  message: string,
  fields?: ValidationFieldError[],
  options?: ErrorOptions,
): never {
  throw validationError(message, fields, options);
}

export function throwUnauthorizedError(
  message?: string,
  options?: ErrorOptions,
): never {
  throw unauthorized(message, options);
}

export function throwForbiddenError(
  action?: string,
  options?: ErrorOptions,
): never {
  throw forbidden(action, options);
}

export function throwInternalError(
  devMessage?: string,
  options?: ErrorOptions,
): never {
  throw internal(devMessage, options);
}

export function throwConflictError(
  resource: string,
  identifier?: string,
  options?: ErrorOptions,
): never {
  throw alreadyExists(resource, identifier, options);
}

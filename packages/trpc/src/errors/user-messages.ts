import { ErrorCode, type ErrorCodeType } from "./error-codes";

export const DefaultUserMessages: Record<ErrorCodeType, string> = {
  [ErrorCode.INVALID_CREDENTIALS]:
    "The email or password you entered is incorrect. Please try again.",
  [ErrorCode.TOKEN_EXPIRED]:
    "Your session has expired. Please log in again to continue.",
  [ErrorCode.TOKEN_INVALID]:
    "Your session is invalid. Please log in again to continue.",
  [ErrorCode.TOKEN_MISSING]: "Please log in to access this feature.",
  [ErrorCode.REFRESH_TOKEN_EXPIRED]:
    "Your session has expired. Please log in again.",
  [ErrorCode.REFRESH_TOKEN_INVALID]:
    "Your session is invalid. Please log in again.",
  [ErrorCode.SESSION_EXPIRED]:
    "Your session has expired. Please log in again to continue.",
  [ErrorCode.USER_NOT_FOUND]:
    "We couldn't find an account with those credentials.",
  [ErrorCode.EMAIL_ALREADY_EXISTS]:
    "An account with this email already exists. Try logging in or use a different email.",
  [ErrorCode.TOO_MANY_ATTEMPTS]:
    "Too many attempts. Please wait a few minutes and try again.",
  [ErrorCode.ACCOUNT_DISABLED]:
    "Your account has been disabled. Please contact support for assistance.",
  [ErrorCode.ACCOUNT_LOCKED]:
    "Your account has been temporarily locked. Please try again later or contact support.",
  [ErrorCode.PASSWORD_MISMATCH]:
    "The passwords you entered don't match. Please try again.",
  [ErrorCode.WEAK_PASSWORD]:
    "Please choose a stronger password with at least 8 characters, including numbers and special characters.",
  [ErrorCode.UNAUTHORIZED]: "You need to be logged in to perform this action.",
  [ErrorCode.FORBIDDEN]: "You don't have permission to access this resource.",
  [ErrorCode.INSUFFICIENT_PERMISSIONS]:
    "You don't have the required permissions for this action. Contact your administrator if you need access.",
  [ErrorCode.ROLE_NOT_ALLOWED]:
    "Your current role doesn't allow this action. Contact your administrator if you need access.",

  [ErrorCode.INVALID_INPUT]:
    "The information you provided is invalid. Please check your entries and try again.",
  [ErrorCode.REQUIRED_FIELD_MISSING]: "Please fill in all required fields.",
  [ErrorCode.INVALID_FORMAT]:
    "The format of your input is incorrect. Please check and try again.",
  [ErrorCode.INVALID_EMAIL]: "Please enter a valid email address.",
  [ErrorCode.INVALID_PHONE]: "Please enter a valid phone number.",
  [ErrorCode.INVALID_DATE]: "Please enter a valid date.",
  [ErrorCode.INVALID_DATE_RANGE]:
    "The date range you specified is invalid. Please ensure the end date is after the start date.",
  [ErrorCode.VALUE_OUT_OF_RANGE]:
    "The value you entered is outside the allowed range.",
  [ErrorCode.STRING_TOO_LONG]:
    "The text you entered is too long. Please shorten it and try again.",
  [ErrorCode.STRING_TOO_SHORT]:
    "The text you entered is too short. Please provide more information.",
  [ErrorCode.INVALID_ENUM_VALUE]: "Please select a valid option from the list.",
  [ErrorCode.DUPLICATE_ENTRY]:
    "This entry already exists. Please use a different value.",
  [ErrorCode.REFERENCE_NOT_FOUND]:
    "The selected item could not be found. It may have been deleted or moved.",
  [ErrorCode.INVALID_REFERENCE]:
    "The selected item is invalid or no longer available.",
  [ErrorCode.CIRCULAR_REFERENCE]:
    "This would create a circular relationship, which is not allowed.",
  [ErrorCode.DATA_INTEGRITY_ERROR]:
    "The data could not be saved due to a consistency issue. Please try again.",
  [ErrorCode.FILE_TOO_LARGE]:
    "The file is too large. Please choose a smaller file or compress it.",
  [ErrorCode.INVALID_FILE_TYPE]:
    "This file type is not supported. Please choose a different file.",
  [ErrorCode.FILE_UPLOAD_FAILED]:
    "The file could not be uploaded. Please try again.",

  [ErrorCode.NOT_FOUND]:
    "The requested item could not be found. It may have been deleted or moved.",
  [ErrorCode.ALREADY_EXISTS]:
    "This item already exists. Please try a different name or value.",
  [ErrorCode.DELETED]: "This item has been deleted and is no longer available.",
  [ErrorCode.ARCHIVED]: "This item has been archived and is no longer active.",
  [ErrorCode.INVALID_STATE]:
    "This action cannot be performed on the item in its current state.",
  [ErrorCode.STATE_TRANSITION_NOT_ALLOWED]:
    "This status change is not allowed. Please check the current status and try again.",
  [ErrorCode.LOCKED]: "This item is currently locked and cannot be modified.",
  [ErrorCode.IN_USE]: "This item is currently in use and cannot be deleted.",
  [ErrorCode.CREATE_FAILED]: "We couldn't create the item. Please try again.",
  [ErrorCode.UPDATE_FAILED]: "We couldn't save your changes. Please try again.",
  [ErrorCode.DELETE_FAILED]: "We couldn't delete the item. Please try again.",
  [ErrorCode.FETCH_FAILED]:
    "We couldn't load the data. Please refresh and try again.",

  [ErrorCode.RULE_VIOLATION]:
    "This action violates business rules. Please review and try again.",
  [ErrorCode.PRECONDITION_FAILED]:
    "The required conditions for this action are not met.",
  [ErrorCode.OPERATION_NOT_ALLOWED]:
    "This operation is not allowed at this time.",
  [ErrorCode.QUOTA_EXCEEDED]:
    "You've reached the limit for this resource. Please contact your administrator.",
  [ErrorCode.LIMIT_REACHED]: "You've reached the maximum allowed limit.",
  [ErrorCode.WORK_ORDER_CLOSED]:
    "This work order is closed and cannot be modified.",
  [ErrorCode.PROPOSAL_ALREADY_APPROVED]:
    "This proposal has already been approved and cannot be changed.",
  [ErrorCode.SITE_NOT_ACTIVE]:
    "This site is not active. Please select an active site.",
  [ErrorCode.CLIENT_INACTIVE]:
    "This client is inactive. Please select an active client.",
  [ErrorCode.OFFICE_FULL]: "This office has reached its capacity limit.",
  [ErrorCode.BUDGET_EXCEEDED]: "This action would exceed the allocated budget.",
  [ErrorCode.DATE_CONFLICT]:
    "There's a scheduling conflict with the selected dates.",
  [ErrorCode.ASSIGNMENT_CONFLICT]:
    "This assignment conflicts with existing assignments.",

  [ErrorCode.SERVICE_UNAVAILABLE]:
    "The service is temporarily unavailable. Please try again in a few minutes.",
  [ErrorCode.TIMEOUT]:
    "The request took too long to complete. Please try again.",
  [ErrorCode.CONNECTION_FAILED]:
    "We couldn't connect to the service. Please check your connection and try again.",
  [ErrorCode.RATE_LIMITED]:
    "Too many requests. Please wait a moment and try again.",
  [ErrorCode.SHAREPOINT_AUTH_FAILED]:
    "We couldn't connect to the document storage. Please try again later.",
  [ErrorCode.SHAREPOINT_UPLOAD_FAILED]:
    "The document could not be uploaded. Please try again.",
  [ErrorCode.SHAREPOINT_DOWNLOAD_FAILED]:
    "The document could not be downloaded. Please try again.",
  [ErrorCode.SHAREPOINT_PERMISSION_DENIED]:
    "You don't have permission to access this document.",
  [ErrorCode.DATABASE_ERROR]:
    "We're experiencing technical difficulties. Please try again later.",
  [ErrorCode.DATABASE_CONNECTION_FAILED]:
    "We're having trouble connecting to our servers. Please try again later.",
  [ErrorCode.DATABASE_TIMEOUT]: "The request took too long. Please try again.",

  [ErrorCode.INTERNAL_ERROR]:
    "Something went wrong on our end. Please try again later.",
  [ErrorCode.UNEXPECTED_ERROR]:
    "An unexpected error occurred. Please try again later.",
  [ErrorCode.CONFIGURATION_ERROR]:
    "The system is not configured correctly. Please contact support.",
  [ErrorCode.MAINTENANCE_MODE]:
    "The system is currently undergoing maintenance. Please try again later.",
  [ErrorCode.MEMORY_EXHAUSTED]:
    "The system is currently overloaded. Please try again later.",
  [ErrorCode.DISK_FULL]:
    "The system is running low on storage. Please contact support.",
  [ErrorCode.OVERLOADED]:
    "The system is currently experiencing high traffic. Please try again later.",
};

export function getUserMessage(
  code: ErrorCodeType,
  customMessage?: string
): string {
  return (
    customMessage ||
    DefaultUserMessages[code] ||
    "An error occurred. Please try again."
  );
}

export const GENERIC_ERROR_MESSAGE =
  "Something went wrong. Please try again later.";

export const UNKNOWN_ERROR_MESSAGE =
  "An unexpected error occurred. Our team has been notified.";

import { isAPIError } from "@pkg/auth";
import {
  AppError,
  forbidden,
  fromUnknown,
  notFound,
  unauthorized,
  validationError,
} from "../errors";

// Turns an error from a Better Auth call into the portal's own kind, keeping
// Better Auth's message for the user. `action` says what was being done, as
// in "Creating user".
export const fromAuthError = (error: unknown, action: string): AppError => {
  if (!isAPIError(error)) return fromUnknown(error, action);

  const message = error.body?.message ?? error.message;
  const options = {
    userMessage: message,
    devMessage: `${action}: ${message}`,
    cause: error,
  };

  switch (error.status) {
    case "UNAUTHORIZED":
      return unauthorized(message, options);
    case "FORBIDDEN":
      return forbidden(action.toLowerCase(), options);
    case "NOT_FOUND":
      return notFound("User", undefined, options);
    default:
      return validationError(message, [], options);
  }
};

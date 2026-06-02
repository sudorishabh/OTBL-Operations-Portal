import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";

export const transformError = (error: unknown): TRPCError => {
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return new TRPCError({
      code: "BAD_REQUEST",
      message: "Validation failed",
      cause: {
        errors: formattedErrors,
        zodError: error,
      },
    });
  }

  if (error instanceof Error) {
    if (error.message.includes("duplicate key")) {
      return new TRPCError({
        code: "CONFLICT",
        message: "Resource already exists",
      });
    }

    if (error.message.includes("foreign key")) {
      return new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid relational reference",
      });
    }

    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected error",
  });
};

export const errorFormatter = ({
  shape,
  error,
}: {
  shape: any;
  error: TRPCError;
}) => {
  const cause = error.cause as any;

  return {
    ...shape,
    data: {
      ...shape.data,
      errorCode: cause?.errorCode,
      validationErrors: cause?.errors,
      stack: true ? error.stack : undefined,
    },
  };
};

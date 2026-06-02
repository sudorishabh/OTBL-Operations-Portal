import type { TrpcContext, TrpcAuthenticatedContext } from "../context";
import { TRPCError } from "@trpc/server";
import {
  transformToTRPCError,
  createUnauthorizedError,
  createInternalError,
  AppError,
} from "../errors";

export type Handler<Input = unknown, Output = unknown> = (opts: {
  input: Input;
  ctx: TrpcContext;
}) => Promise<Output> | Output;

export type ProtectedHandler<Input = unknown, Output = unknown> = (opts: {
  input: Input;
  ctx: TrpcAuthenticatedContext;
}) => Promise<Output> | Output;

type HandlerOptions = {
  onErrorMessage?: string;
};

function buildWrapper<Input = unknown, Output = unknown>(
  handler: Handler<Input, Output>,
  options?: HandlerOptions,
) {
  return async (opts: { input: Input; ctx: TrpcContext }) => {
    const { input, ctx } = opts || ({} as any);

    if (!ctx) {
      throw createInternalError(undefined, {
        devMessage: "Missing tRPC context in handler",
      });
    }

    try {
      const result = await handler({ input, ctx });
      return result as Output;
    } catch (error: unknown) {
      if (error instanceof TRPCError) {
        throw error;
      }
      if (error instanceof AppError) {
        throw transformToTRPCError(error);
      }

      const message = options?.onErrorMessage ?? "Internal server error";
      throw createInternalError(undefined, {
        devMessage: error instanceof Error ? error.message : message,
        userMessage: message,
        cause: error,
      });
    }
  };
}

function buildProtectedWrapper<Input = unknown, Output = unknown>(
  handler: ProtectedHandler<Input, Output>,
  options?: HandlerOptions,
) {
  return async (opts: { input: Input; ctx: TrpcAuthenticatedContext }) => {
    const { input, ctx } = opts || ({} as any);

    if (!ctx) {
      throw createInternalError(undefined, {
        devMessage: "Missing tRPC context in protected handler",
      });
    }

    if (!ctx.user) {
      throw createUnauthorizedError(undefined, {
        userMessage: "Authentication required",
        devMessage: "No user in context for protected handler",
      });
    }

    try {
      const result = await handler({ input, ctx });
      return result as Output;
    } catch (error: unknown) {
      if (error instanceof TRPCError) {
        throw error;
      }
      if (error instanceof AppError) {
        throw transformToTRPCError(error);
      }

      const message = options?.onErrorMessage ?? "Internal server error";
      throw createInternalError(undefined, {
        devMessage: error instanceof Error ? error.message : message,
        userMessage: message,
        cause: error,
      });
    }
  };
}

export function handleQuery<Input = unknown, Output = unknown>(
  handler: Handler<Input, Output>,
  options?: HandlerOptions,
) {
  return buildWrapper(handler, options);
}

export function handleMutation<Input = unknown, Output = unknown>(
  handler: Handler<Input, Output>,
  options?: HandlerOptions,
) {
  return buildWrapper(handler, options);
}

export function handleProtectedQuery<Input = unknown, Output = unknown>(
  handler: ProtectedHandler<Input, Output>,
  options?: HandlerOptions,
) {
  return buildProtectedWrapper(handler, options);
}

export function handleProtectedMutation<Input = unknown, Output = unknown>(
  handler: ProtectedHandler<Input, Output>,
  options?: HandlerOptions,
) {
  return buildProtectedWrapper(handler, options);
}

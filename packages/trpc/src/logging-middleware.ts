import { TRPCError } from "@trpc/server";
import { t } from "./trpc";

export const loggingMiddleware = t.middleware(async (opts) => {
  const { path, type, next } = opts;
  const start = Date.now();

  // The raw input is deliberately not logged: this middleware wraps every
  // procedure, including authMutation.login, so it would write plaintext
  // passwords to the logs.
  console.log(`🔄 tRPC ${type.toUpperCase()} ${path} - Start`, {
    timestamp: new Date().toISOString(),
  });

  const logTRPCError = (error: TRPCError, durationMs: number) => {
    console.error(`❌ tRPC ${type.toUpperCase()} ${path} - TRPCError`, {
      code: error.code,
      message: error.message,
      cause: error.cause,
      durationMs,
      timestamp: new Date().toISOString(),
    });
  };

  try {
    const result = await next();
    const durationMs = Date.now() - start;

    // `next()` reports a downstream failure by resolving with
    // `{ ok: false, error }` instead of throwing, so the result has to be
    // inspected. Relying on `catch` alone logs every rejected request —
    // a failed login included — as a success.
    if (!result.ok) {
      logTRPCError(result.error, durationMs);
      return result;
    }

    console.log(`✅ tRPC ${type.toUpperCase()} ${path} - Success`, {
      durationMs,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    // Reached when something throws outside the downstream chain rather than
    // being funnelled into a middleware result.
    const durationMs = Date.now() - start;

    if (error instanceof TRPCError) {
      logTRPCError(error, durationMs);
    } else {
      console.error(`💥 tRPC ${type.toUpperCase()} ${path} - UnhandledError`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        durationMs,
        timestamp: new Date().toISOString(),
      });
    }

    throw error;
  }
});

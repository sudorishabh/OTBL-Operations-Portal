import { TRPCError } from "@trpc/server";
import { t } from "./trpc";

export const loggingMiddleware = t.middleware(async (opts) => {
  const { path, type, next, input } = opts;
  const start = Date.now();

  console.log(`🔄 tRPC ${type.toUpperCase()} ${path} - Start`, {
    input: input,
    timestamp: new Date().toISOString(),
  });

  try {
    const result = await next();
    const durationMs = Date.now() - start;

    console.log(`✅ tRPC ${type.toUpperCase()} ${path} - Success`, {
      durationMs,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    const durationMs = Date.now() - start;

    if (error instanceof TRPCError) {
      console.error(`❌ tRPC ${type.toUpperCase()} ${path} - TRPCError`, {
        code: error.code,
        message: error.message,
        cause: error.cause,
        durationMs,
        timestamp: new Date().toISOString(),
      });
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

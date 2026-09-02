import rateLimit, { type AugmentedRequest } from "express-rate-limit";
import type { Request, Response } from "express";
import appEnv from "./app-env";

/**
 * tRPC addresses procedures with a dot, not a slash — the URL for the `login`
 * procedure of the `authMutation` router is `/trpc/authMutation.login`.
 *
 * Express matches mount paths on `/` boundaries, so `app.use("/trpc/authMutation")`
 * never matches `/trpc/authMutation.login`. Limiters therefore have to be mounted
 * on `/trpc` and select their bucket by reading the procedure path themselves.
 */

/** Procedures that are cheap to call but expensive to have brute forced. */
const SENSITIVE_PROCEDURES = new Set([
  "authMutation.login",
  "authMutation.refreshToken",
  "userMutation.updateUserPassword",
]);

/**
 * Extracts the procedure paths targeted by a request.
 *
 * Single call:  /trpc/authMutation.login        -> ["authMutation.login"]
 * Batched call: /trpc/a.one,b.two?batch=1       -> ["a.one", "b.two"]
 */
export const getProcedurePaths = (req: Request): string[] => {
  // `req.path` is relative to the mount point, but fall back to stripping a
  // `/trpc` prefix so this stays correct if the limiter is mounted elsewhere.
  const raw = req.path.replace(/^\/+/, "").replace(/^trpc\/?/, "");
  if (!raw) return [];
  return raw
    .split(",")
    .map((p) => decodeURIComponent(p).trim())
    .filter(Boolean);
};

const isBatchRequest = (req: Request): boolean => req.query.batch === "1";

/**
 * Responds with a tRPC-shaped error envelope so the client surfaces the message
 * instead of failing to parse the body. Batched requests expect an array.
 */
const trpcTooManyRequests = (req: Request, res: Response): void => {
  // v8 no longer augments Express's Request globally; the info lives on
  // `requestPropertyName`, which defaults to "rateLimit".
  const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
  const retryAfterSeconds = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : undefined;

  const message = retryAfterSeconds
    ? `Too many requests. Please try again in ${retryAfterSeconds} second(s).`
    : "Too many requests. Please try again later.";

  if (retryAfterSeconds) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
  }

  const envelope = (path?: string) => ({
    error: {
      message,
      // JSON-RPC code tRPC uses for TOO_MANY_REQUESTS.
      code: -32029,
      data: {
        code: "TOO_MANY_REQUESTS",
        httpStatus: 429,
        retryAfterSeconds,
        ...(path ? { path } : {}),
      },
    },
  });

  const paths = getProcedurePaths(req);

  res
    .status(429)
    .json(
      isBatchRequest(req)
        ? paths.map((path) => envelope(path))
        : envelope(paths[0])
    );
};

const sharedOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: trpcTooManyRequests,
} as const;

/** Strict bucket for credential-guessing surfaces. */
export const sensitiveRateLimiter = rateLimit({
  ...sharedOptions,
  windowMs: appEnv.RATE_LIMIT.SENSITIVE_WINDOW_MS,
  limit: appEnv.RATE_LIMIT.SENSITIVE_MAX,
});

/** Broad bucket protecting the API from general hammering. */
export const generalRateLimiter = rateLimit({
  ...sharedOptions,
  windowMs: appEnv.RATE_LIMIT.GENERAL_WINDOW_MS,
  limit: appEnv.RATE_LIMIT.GENERAL_MAX,
});

/**
 * Mount on `/trpc`. Applies the strict limiter when the request touches a
 * sensitive procedure (including as part of a batch), otherwise the general one.
 */
export const trpcRateLimiter = (
  req: Request,
  res: Response,
  next: (err?: unknown) => void
): void => {
  if (!appEnv.RATE_LIMIT.ENABLED) return next();

  const paths = getProcedurePaths(req);
  const isSensitive = paths.some((path) => SENSITIVE_PROCEDURES.has(path));

  const limiter = isSensitive ? sensitiveRateLimiter : generalRateLimiter;
  limiter(req, res, next);
};

export default trpcRateLimiter;

import rateLimit, { type AugmentedRequest } from "express-rate-limit";
import type { Request, Response } from "express";
import appEnv from "./app-env";

/**
 * Requests to the API are limited per address: tRPC calls broadly, and Better
 * Auth's sign-in and password routes strictly, as they are what a password
 * guesser hits. Better Auth also locks an account after too many failures,
 * wherever they come from (see @pkg/auth).
 */

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
const makeTrpcTooManyRequestsHandler =
  (describe: (retryAfterSeconds?: number) => string) =>
  (req: Request, res: Response): void => {
    // v8 no longer augments Express's Request globally; the info lives on
    // `requestPropertyName`, which defaults to "rateLimit".
    const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
    const retryAfterSeconds = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
      : undefined;

    if (retryAfterSeconds) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
    }

    const envelope = (path?: string) => ({
      error: {
        message: describe(retryAfterSeconds),
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

const describeRequestLimit = (retryAfterSeconds?: number) =>
  retryAfterSeconds
    ? `Too many requests. Please try again in ${retryAfterSeconds} second(s).`
    : "Too many requests. Please try again later.";

const sharedOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeTrpcTooManyRequestsHandler(describeRequestLimit),
} as const;

/** Broad bucket protecting the API from general hammering. */
export const generalRateLimiter = rateLimit({
  ...sharedOptions,
  windowMs: appEnv.RATE_LIMIT.GENERAL_WINDOW_MS,
  limit: appEnv.RATE_LIMIT.GENERAL_MAX,
});

/**
 * Strict bucket for Better Auth's sign-in and password routes, answering in
 * Better Auth's own error shape so its client shows the message.
 */
export const authRateLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  windowMs: appEnv.RATE_LIMIT.SENSITIVE_WINDOW_MS,
  limit: appEnv.RATE_LIMIT.SENSITIVE_MAX,
  skip: () => !appEnv.RATE_LIMIT.ENABLED,
  handler: (req, res) => {
    const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
    const minutes = resetTime
      ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 60_000))
      : undefined;
    res.status(429).json({
      code: "TOO_MANY_REQUESTS",
      message: minutes
        ? `Too many sign-in attempts. Please try again in ${minutes} minute(s).`
        : "Too many sign-in attempts. Please try again later.",
    });
  },
});

/** Mount on `/trpc`: the general bucket for every procedure. */
export const trpcRateLimiter = (
  req: Request,
  res: Response,
  next: (err?: unknown) => void
): void => {
  if (!appEnv.RATE_LIMIT.ENABLED) return next();
  generalRateLimiter(req, res, next);
};

export default trpcRateLimiter;

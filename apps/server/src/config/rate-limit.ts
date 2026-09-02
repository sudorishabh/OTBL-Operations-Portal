import rateLimit, {
  ipKeyGenerator,
  type AugmentedRequest,
} from "express-rate-limit";
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

const LOGIN_PROCEDURE = "authMutation.login";

/** Procedures that are cheap to call but expensive to have brute forced. */
const SENSITIVE_PROCEDURES = new Set([
  LOGIN_PROCEDURE,
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

const describeAccountLimit = (retryAfterSeconds?: number) =>
  retryAfterSeconds
    ? `Too many failed login attempts for this account. Please try again in ${retryAfterSeconds} second(s).`
    : "Too many failed login attempts for this account. Please try again later.";

const sharedOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: makeTrpcTooManyRequestsHandler(describeRequestLimit),
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
 * Reads the email a login request is targeting.
 *
 * The web client sends mutations over a non-batched `httpLink`, so the body is
 * the procedure input itself. The batched shape is handled too, in case a client
 * ever routes login through `httpBatchLink`.
 */
export const getLoginEmail = (req: Request): string | undefined => {
  const body: unknown = req.body;
  if (!body || typeof body !== "object") return undefined;

  const candidates: unknown[] = isBatchRequest(req)
    ? Object.values(body as Record<string, unknown>)
    : [body];

  for (const candidate of candidates) {
    const email = (candidate as { email?: unknown } | null)?.email;
    if (typeof email === "string" && email.trim()) {
      return email.trim().toLowerCase();
    }
  }

  return undefined;
};

/**
 * Per-account bucket for login.
 *
 * The IP bucket alone does not stop an attacker who rotates source addresses
 * against one account, so failures are also counted per email. Successful
 * logins are not counted, meaning a legitimate user is never locked out by
 * someone else guessing at their account.
 */
export const loginAccountRateLimiter = rateLimit({
  ...sharedOptions,
  windowMs: appEnv.RATE_LIMIT.LOGIN_ACCOUNT_WINDOW_MS,
  limit: appEnv.RATE_LIMIT.LOGIN_ACCOUNT_MAX,
  handler: makeTrpcTooManyRequestsHandler(describeAccountLimit),
  // tRPC answers a rejected login with HTTP 401, so this counts failures only.
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = getLoginEmail(req as Request);
    // No email means the request cannot pass validation anyway; fall back to IP
    // so it still cannot be used to probe for free.
    return email
      ? `account:${email}`
      : ipKeyGenerator((req as Request).ip ?? "");
  },
});

/**
 * Mount on `/trpc`. Applies the strict limiter when the request touches a
 * sensitive procedure (including as part of a batch), otherwise the general
 * one. Login additionally passes through the per-account bucket.
 */
export const trpcRateLimiter = (
  req: Request,
  res: Response,
  next: (err?: unknown) => void
): void => {
  if (!appEnv.RATE_LIMIT.ENABLED) return next();

  const paths = getProcedurePaths(req);
  const isSensitive = paths.some((path) => SENSITIVE_PROCEDURES.has(path));
  const isLogin = paths.includes(LOGIN_PROCEDURE);

  const limiter = isSensitive ? sensitiveRateLimiter : generalRateLimiter;

  if (!isLogin) {
    limiter(req, res, next);
    return;
  }

  limiter(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    loginAccountRateLimiter(req, res, next);
  });
};

export default trpcRateLimiter;

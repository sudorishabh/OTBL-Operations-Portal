// Locks an account's email sign-in for a while after too many wrong
// passwords, wherever they come from, so spreading guesses across addresses
// doesn't get round the per-address limit in front of the API. Kept in
// memory, like the API's other limits, so it resets when the API restarts.
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";

const SIGN_IN_PATH = "/sign-in/email";

export interface LoginGuardOptions {
  // How long failures count, and how long a locked account stays locked.
  windowMs: number;
  // Failures allowed in that time.
  max: number;
}

export const createLoginGuard = ({ windowMs, max }: LoginGuardOptions) => {
  const failures = new Map<string, { count: number; resetAt: number }>();

  const emailOf = (body: unknown) => {
    const email = (body as { email?: unknown } | undefined)?.email;
    return typeof email === "string" ? email.trim().toLowerCase() : null;
  };

  // Refuses a sign-in to an account that has run out of tries.
  const before = createAuthMiddleware(async (ctx) => {
    if (ctx.path !== SIGN_IN_PATH) return;
    const email = emailOf(ctx.body);
    const entry = email ? failures.get(email) : undefined;
    if (!email || !entry) return;
    if (entry.resetAt <= Date.now()) {
      failures.delete(email);
      return;
    }
    if (entry.count >= max) {
      const minutes = Math.ceil((entry.resetAt - Date.now()) / 60_000);
      throw new APIError("TOO_MANY_REQUESTS", {
        message: `Too many failed sign-ins for this account. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      });
    }
  });

  // Counts a failed sign-in, and forgets them once one succeeds.
  const after = createAuthMiddleware(async (ctx) => {
    if (ctx.path !== SIGN_IN_PATH) return;
    const email = emailOf(ctx.body);
    if (!email) return;
    if (!isAPIError(ctx.context.returned)) {
      failures.delete(email);
      return;
    }
    const now = Date.now();
    const entry = failures.get(email);
    if (!entry || entry.resetAt <= now) {
      failures.set(email, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count += 1;
    }
  });

  return { before, after };
};

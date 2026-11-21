import { createAuth } from "@pkg/auth";
import { db } from "./db";
import appEnv from "./config/app-env";
import { allowedOrigins } from "./config/cors";

// Better Auth, mounted at /api/auth for signing in and out, and read by the
// tRPC context for who is signed in.
export const auth = createAuth({
  db,
  secret: appEnv.AUTH.SECRET,
  baseURL: appEnv.AUTH.URL,
  trustedOrigins: allowedOrigins,
  production: process.env.NODE_ENV === "production",
  loginGuard: {
    windowMs: appEnv.RATE_LIMIT.LOGIN_ACCOUNT_WINDOW_MS,
    max: appEnv.RATE_LIMIT.LOGIN_ACCOUNT_MAX,
  },
});

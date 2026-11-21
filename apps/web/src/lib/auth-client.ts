"use client";
import { createAuthClient } from "better-auth/react";

// Better Auth in the browser: signing in and out, and changing one's own
// password. It talks to the API's /api/auth, directly in development and
// through the app's own origin, rewritten to the API, in production. Users
// are managed through the API, and what a role may do is checked with
// `can` from @pkg/auth/permissions.
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL || undefined,
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
});

// Better Auth's message for a failed call, or `fallback`.
export const authErrorMessage = (
  error: { message?: string } | null | undefined,
  fallback: string,
) => error?.message || fallback;

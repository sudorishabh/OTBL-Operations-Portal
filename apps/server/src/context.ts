import * as trpcExpress from "@trpc/server/adapters/express";
import { fromNodeHeaders } from "better-auth/node";
import type { TrpcContext, TrpcUser } from "@pkg/trpc";
import { db } from "./db";
import { auth } from "./auth";
import appEnv from "./config/app-env";

// Who is calling, from their Better Auth session: its cookie from the web
// app, or a Bearer token from other clients.
export const createContext = async ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions): Promise<TrpcContext> => {
  const headers = fromNodeHeaders(req.headers);
  const { headers: authHeaders, response: session } =
    await auth.api.getSession({ headers, returnHeaders: true });

  // Passes on a renewed session cookie, so an active user stays signed in.
  const setCookies = authHeaders.getSetCookie();
  if (setCookies.length > 0) res.append("Set-Cookie", setCookies);

  const user: TrpcUser | null = session
    ? {
        sub: String(session.user.id),
        email: session.user.email,
        role: session.user.role as TrpcUser["role"],
      }
    : null;

  return {
    req,
    res,
    user,
    db,
    auth,
    headers,
    appEnv: {
      ...appEnv,
      NODE_ENV: process.env.NODE_ENV || "development",
    },
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

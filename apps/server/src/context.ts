import * as trpcExpress from "@trpc/server/adapters/express";
import { db } from "./db";
import {
  verifyTokenSafe,
  verifyRefreshTokenSafe,
  signToken,
  signRefreshToken,
  setAuthenticationCookies,
  type UserRole,
} from "@pkg/utils/auth";
import appEnv from "./config/app-env";
import type { TrpcContext, TrpcUser } from "@pkg/trpc";

export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions): TrpcContext => {
  let user: TrpcUser | null = null;
  let tokensRefreshed = false;

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const result = verifyTokenSafe(token, process.env.JWT_SECRET!);
    if (result.success) {
      user = {
        sub: result.payload.sub,
        email: result.payload.email,
        role: result.payload.role as UserRole,
      };
    }
  }

  const cookieAccessToken = req.cookies?.session || req.cookies?.accessToken;
  if (!user && cookieAccessToken) {
    const result = verifyTokenSafe(
      cookieAccessToken,
      process.env.JWT_SECRET!
    );
    if (result.success) {
      user = {
        sub: result.payload.sub,
        email: result.payload.email,
        role: result.payload.role as UserRole,
      };
    }
  }

  if (!user && req.cookies?.refreshToken) {
    const refreshResult = verifyRefreshTokenSafe(
      req.cookies.refreshToken,
      process.env.JWT_REFRESH_SECRET!
    );

    if (refreshResult.success) {
      const payload = refreshResult.payload;
      user = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role as UserRole,
      };

      const tokenPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      const newAccessToken = signToken(
        tokenPayload,
        process.env.JWT_SECRET!,
        appEnv.JWT.EXPIRES_IN
      );

      const newRefreshToken = signRefreshToken(
        tokenPayload,
        process.env.JWT_REFRESH_SECRET!,
        appEnv.JWT.REFRESH_EXPIRES_IN
      );

      setAuthenticationCookies({
        res,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessExpiresIn: appEnv.JWT.EXPIRES_IN,
        refreshExpiresIn: appEnv.JWT.REFRESH_EXPIRES_IN,
        node_env: process.env.NODE_ENV || "development",
      });

      tokensRefreshed = true;
    }
  }

  if (!appEnv) {
    throw new Error(
      "appEnv is not configured. Ensure app environment is loaded before creating context."
    );
  }

  if (!db) {
    throw new Error(
      "Database client is not initialized. Ensure the DB is set up before creating context."
    );
  }

  return {
    req,
    res,
    user,
    db,
    appEnv: {
      ...appEnv,
      NODE_ENV: process.env.NODE_ENV || "development",
    },
  };
};

export type Context = ReturnType<typeof createContext>;

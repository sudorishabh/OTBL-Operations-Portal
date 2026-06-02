import { Response, CookieOptions } from "express";
import * as dateTimeUtils from "../date-time";

const { calculateExpirationDate } = dateTimeUtils;

type CookiePayloadType = {
  res: Response;
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  node_env: string;
};

const defaults = (node_env: string): CookieOptions => ({
  httpOnly: true,
  secure: node_env === "production" ? true : false,
  sameSite: node_env === "production" ? "strict" : "lax",
});

const sessionDefaults: CookieOptions = {
  httpOnly: true,
  secure: true, // set true only with HTTPS
  sameSite: "lax",
};

export const getRefreshTokenCookieOptions = (
  node_env: string,
  expiresIn: string,
): CookieOptions => {
  const expires = calculateExpirationDate(expiresIn);
  return {
    ...defaults(node_env),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    expires,
    path: "/", // Available on all routes, not just the refresh endpoint
  };
};

export const getAccessTokenCookieOptions = (
  node_env: string,
  expiresIn: string,
): CookieOptions => {
  const expires = calculateExpirationDate(expiresIn);
  return {
    ...defaults(node_env),
    maxAge: 30 * 60 * 1000,
    expires,
    path: "/",
  };
};

export const setAuthenticationCookies = ({
  res,
  accessToken,
  refreshToken,
  accessExpiresIn,
  refreshExpiresIn,
  node_env,
}: CookiePayloadType): Response =>
  res
    // Prefer a single "session" cookie for auth (back-compat with accessToken).
    .cookie("session", accessToken, {
      ...sessionDefaults,
      path: "/",
    })
    .cookie(
      "accessToken",
      accessToken,
      getAccessTokenCookieOptions(node_env, accessExpiresIn),
    )
    .cookie(
      "refreshToken",
      refreshToken,
      getRefreshTokenCookieOptions(node_env, refreshExpiresIn),
    );

export const clearAuthenticationCookies = (res: Response): Response =>
  res
    .clearCookie("session", { path: "/" })
    .clearCookie("accessToken")
    .clearCookie("refreshToken", {
      path: "/",
    });

import { getEnv } from "../utils/get-env";

const getEnvInt = (key: string, defaultValue: number): number => {
  const parsed = Number(getEnv(key, String(defaultValue)));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Environment variable ${key} must be a positive number, got "${process.env[key]}"`
    );
  }
  return parsed;
};

const getEnvBool = (key: string, defaultValue: boolean): boolean =>
  getEnv(key, String(defaultValue)).toLowerCase() === "true";

/**
 * Resolves Express's `trust proxy` setting.
 *
 * "false" (default) — no proxy; `req.ip` is the socket address.
 * "<n>"             — number of proxy hops in front of the app.
 * "<ip>,<cidr>"     — explicit list of trusted proxy addresses.
 * "true"            — trust every hop. Lets any client spoof X-Forwarded-For
 *                     and thereby sidestep rate limiting, so it warns.
 */
const parseTrustProxy = (raw: string): boolean | number | string[] => {
  const value = raw.trim();

  if (value.toLowerCase() === "false" || value === "") return false;

  if (value.toLowerCase() === "true") {
    console.warn(
      "[config] TRUST_PROXY=true trusts every hop, which allows clients to " +
        "spoof X-Forwarded-For and bypass rate limiting. Prefer a hop count " +
        "(e.g. TRUST_PROXY=1) or an explicit proxy address list."
    );
    return true;
  }

  if (/^\d+$/.test(value)) return Number(value);

  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
};

export const appEnv = {
  PORT: getEnv("PORT", "7200"),
  DATABASE_URL: getEnv("DATABASE_URL"),
  MOBILE_CLIENT: getEnv("MOBILE_CLIENT"),
  WEB_CLIENT: getEnv("WEB_CLIENT"),
  BASE_PATH: getEnv("BASE_PATH", "/api/v1"),
  JWT: {
    SECRET: getEnv("JWT_SECRET"),
    EXPIRES_IN: getEnv("JWT_EXPIRATION", "30m"),
    REFRESH_SECRET: getEnv("JWT_REFRESH_SECRET"),
    REFRESH_EXPIRES_IN: getEnv("JWT_REFRESH_EXPIRATION", "7d"),
    RESET_PASSWORD_SECRET: getEnv("JWT_RESET_PASSWORD_SECRET"),
    RESET_PASSWORD_EXPIRES_IN: getEnv("JWT_RESET_PASSWORD_EXPIRATION", "1h"),
  },
  SHAREPOINT_TENANT_ID: getEnv("SHAREPOINT_TENANT_ID"),
  SHAREPOINT_CLIENT_ID: getEnv("SHAREPOINT_CLIENT_ID"),
  SHAREPOINT_CLIENT_SECRET: getEnv("SHAREPOINT_CLIENT_SECRET"),
  SHAREPOINT_SITE_URL: getEnv("SHAREPOINT_SITE_URL"),
  TRUST_PROXY: parseTrustProxy(getEnv("TRUST_PROXY", "false")),
  RATE_LIMIT: {
    ENABLED: getEnvBool("RATE_LIMIT_ENABLED", true),
    GENERAL_WINDOW_MS: getEnvInt("RATE_LIMIT_GENERAL_WINDOW_MS", 60 * 1000),
    GENERAL_MAX: getEnvInt("RATE_LIMIT_GENERAL_MAX", 200),
    SENSITIVE_WINDOW_MS: getEnvInt(
      "RATE_LIMIT_SENSITIVE_WINDOW_MS",
      15 * 60 * 1000
    ),
    SENSITIVE_MAX: getEnvInt("RATE_LIMIT_SENSITIVE_MAX", 10),
    LOGIN_ACCOUNT_WINDOW_MS: getEnvInt(
      "RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS",
      15 * 60 * 1000
    ),
    LOGIN_ACCOUNT_MAX: getEnvInt("RATE_LIMIT_LOGIN_ACCOUNT_MAX", 5),
  },
};

export default appEnv;

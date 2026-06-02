import type { UserRole } from "@pkg/utils/auth";
import type { Database } from "@pkg/db";

export type TrpcUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type TrpcAppEnv = {
  JWT: {
    SECRET: string;
    EXPIRES_IN: string;
    REFRESH_SECRET: string;
    REFRESH_EXPIRES_IN: string;
    RESET_PASSWORD_SECRET?: string;
    RESET_PASSWORD_EXPIRES_IN?: string;
  };
  NODE_ENV: string;
  DATABASE_URL?: string;
  WEB_CLIENT?: string;
  MOBILE_CLIENT?: string;
  BASE_PATH?: string;
  SHAREPOINT_TENANT_ID?: string;
  SHAREPOINT_CLIENT_ID?: string;
  SHAREPOINT_CLIENT_SECRET?: string;
  SHAREPOINT_SITE_URL?: string;
  SHAREPOINT_DRIVE_ID?: string;
  PORT?: string;
};

export type TrpcContextBase = {
  req?: { cookies?: Record<string, string> } | undefined;
  res?: any;
  db: Database;
  appEnv: TrpcAppEnv;
};

export type TrpcContext = TrpcContextBase & {
  user?: TrpcUser | null;
};

export type TrpcAuthenticatedContext = TrpcContextBase & {
  user: TrpcUser;
};

export default TrpcContext;

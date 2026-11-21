import type { UserRole } from "@pkg/utils/auth";
import type { Database } from "@pkg/db";
import type { Auth } from "@pkg/auth";

// The signed-in user, from their Better Auth session. `sub` is their user id.
export type TrpcUser = {
  sub: string;
  email: string;
  role: UserRole;
};

export type TrpcAppEnv = {
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
  req?: unknown;
  res?: any;
  db: Database;
  appEnv: TrpcAppEnv;
  auth: Auth;
  // The request's headers, for Better Auth calls made as the signed-in user,
  // which it authorizes against their role, such as adding a user.
  headers: Headers;
};

export type TrpcContext = TrpcContextBase & {
  user?: TrpcUser | null;
};

export type TrpcAuthenticatedContext = TrpcContextBase & {
  user: TrpcUser;
};

export default TrpcContext;

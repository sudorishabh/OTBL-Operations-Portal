// Better Auth for the portal's API: email and password sign-in for the users
// admins create, sessions in the database, and roles from the admin plugin.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, bearer } from "better-auth/plugins";
import bcrypt from "bcrypt";
import { schema, type Database } from "@pkg/db";
import { constants } from "@pkg/utils";
import { ac, roles } from "./permissions";
import { createLoginGuard, type LoginGuardOptions } from "./login-guard";

const { ROLES } = constants;

// Passwords were bcrypt hashes before Better Auth, and stay so, so every
// existing password keeps working.
const SALT_ROUNDS = 12;

export interface AuthOptions {
  db: Database;
  // Signs session cookies and tokens. Better Auth refuses to start in
  // production without one.
  secret?: string;
  // Where the API is reached, such as https://otbl.co.in. Worked out from
  // each request when not given.
  baseURL?: string;
  // Origins allowed to call the auth routes, such as the web app's.
  trustedOrigins: string[];
  // Cookies are marked Secure only in production, so sign-in works over
  // plain http on a developer's machine.
  production: boolean;
  // Locks an account after too many wrong passwords.
  loginGuard: LoginGuardOptions;
}

export const createAuth = ({
  db,
  secret,
  baseURL,
  trustedOrigins,
  production,
  loginGuard,
}: AuthOptions) => {
  const guard = createLoginGuard(loginGuard);

  return betterAuth({
    appName: "OTBL Operations Portal",
    secret,
    baseURL,
    basePath: "/api/auth",
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "mysql",
      schema: {
        users: schema.userTable,
        sessions: schema.sessionTable,
        accounts: schema.accountTable,
        verifications: schema.verificationTable,
      },
    }),
    advanced: {
      // Ids are the database's auto-increment integers, as everywhere else.
      database: { generateId: "serial" },
      cookiePrefix: "otbl",
      useSecureCookies: production,
    },
    // The portal's own tables and snake_case columns.
    user: {
      modelName: "users",
      fields: {
        emailVerified: "email_verified",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      // Set by admins when they add a user, never by users themselves.
      additionalFields: {
        code: { type: "string", required: true, input: false },
        contact_number: { type: "string", required: false, input: false },
        created_by: { type: "number", required: false, input: false },
      },
    },
    session: {
      modelName: "sessions",
      fields: {
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        userId: "user_id",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      // A week, renewed at most once a day while in use.
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // Each request reads the session from a signed cookie for up to five
      // minutes before checking the database again, so a sign-out elsewhere
      // or a new role can take that long to apply.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: {
      modelName: "accounts",
      fields: {
        accountId: "account_id",
        providerId: "provider_id",
        userId: "user_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "verifications",
      fields: {
        expiresAt: "expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    emailAndPassword: {
      enabled: true,
      // Only admins add users.
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      password: {
        hash: (password) => bcrypt.hash(password, SALT_ROUNDS),
        verify: ({ hash, password }) => bcrypt.compare(password, hash),
      },
    },
    // The API limits sign-in attempts per address in front of these routes,
    // and the login guard per account.
    rateLimit: { enabled: false },
    hooks: { before: guard.before, after: guard.after },
    plugins: [
      admin({
        ac,
        roles,
        adminRoles: [ROLES.ADMIN],
        defaultRole: ROLES.OFFICE_OPERATOR,
        schema: {
          user: {
            fields: { banReason: "ban_reason", banExpires: "ban_expires" },
          },
          session: { fields: { impersonatedBy: "impersonated_by" } },
        },
      }),
      // Lets a client without cookies, such as a mobile app, send its
      // session token as a Bearer header instead.
      bearer(),
    ],
  });
};

export type Auth = ReturnType<typeof createAuth>;

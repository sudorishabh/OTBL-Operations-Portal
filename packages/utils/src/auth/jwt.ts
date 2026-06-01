import jwt from "jsonwebtoken";

// User roles as a constant for type safety
export const USER_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  /** @deprecated Split into OFFICE_OPERATOR / SITE_OPERATOR. Retained only
   * during the migration window; removed once no references remain. */
  OPERATOR: "operator",
  /** Office Operator: a member of one or more offices. Assignable to offices only. */
  OFFICE_OPERATOR: "office_operator",
  /** Site Operator: a field user assigned to sites. Assignable to sites only. */
  SITE_OPERATOR: "site_operator",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Role hierarchy for permission checking. Viewer sits at the bottom: it can
// read (no query is role-gated) but is denied every mutation by a dedicated
// middleware, so it never needs to satisfy a write-procedure's minimum role.
// Office and site operators sit at the same level as the legacy operator.
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  manager: 4,
  operator: 2,
  office_operator: 2,
  site_operator: 2,
  viewer: 1,
};

/**
 * JWT payload for access tokens
 */
export type JWTPayload = {
  sub: string; // User ID
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

/**
 * Type for token verification result
 */
export type TokenVerificationResult =
  | { success: true; payload: JWTPayload }
  | { success: false; error: string };

/**
 * Sign an access token
 */
export const signToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
  JWT_SECRET: string,
  expiresIn: string
): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Sign a refresh token (contains minimal claims)
 */
export const signRefreshToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
  JWT_REFRESH_SECRET: string,
  expiresIn: string
): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
};

/**
 * Verify an access token
 */
export const verifyToken = (token: string, JWT_SECRET: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

/**
 * Safely verify an access token, returning a result object instead of throwing
 */
export const verifyTokenSafe = (
  token: string,
  JWT_SECRET: string
): TokenVerificationResult => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return { success: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: "Token expired" };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: "Invalid token" };
    }
    return { success: false, error: "Token verification failed" };
  }
};

/**
 * Verify a refresh token
 */
export const verifyRefreshToken = (
  token: string,
  JWT_REFRESH_SECRET: string
): JWTPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
};

/**
 * Safely verify a refresh token
 */
export const verifyRefreshTokenSafe = (
  token: string,
  JWT_REFRESH_SECRET: string
): TokenVerificationResult => {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    return { success: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { success: false, error: "Refresh token expired" };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { success: false, error: "Invalid refresh token" };
    }
    return { success: false, error: "Refresh token verification failed" };
  }
};

/**
 * Check if a user role has at least the minimum required role level
 */
export const hasMinimumRole = (
  userRole: UserRole,
  requiredRole: UserRole
): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Check if a user has one of the allowed roles
 */
export const hasAnyOfRoles = (
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean => {
  return allowedRoles.includes(userRole);
};

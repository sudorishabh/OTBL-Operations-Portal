import jwt from "jsonwebtoken";

export const USER_ROLES = {
  ADMIN: "admin",
  MANAGER: "office_manager",
  OFFICE_OPERATOR: "office_operator",
  SITE_OPERATOR: "site_operator",
  VIEWER: "viewer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 5,
  office_manager: 4,
  office_operator: 2,
  site_operator: 2,
  viewer: 1,
};

export type JWTPayload = {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
};

export type TokenVerificationResult =
  | { success: true; payload: JWTPayload }
  | { success: false; error: string };

export const signToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
  JWT_SECRET: string,
  expiresIn: string
): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const signRefreshToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
  JWT_REFRESH_SECRET: string,
  expiresIn: string
): string => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const verifyToken = (token: string, JWT_SECRET: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

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

export const verifyRefreshToken = (
  token: string,
  JWT_REFRESH_SECRET: string
): JWTPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
};

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

export const hasMinimumRole = (
  userRole: UserRole,
  requiredRole: UserRole
): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

export const hasAnyOfRoles = (
  userRole: UserRole,
  allowedRoles: UserRole[]
): boolean => {
  return allowedRoles.includes(userRole);
};

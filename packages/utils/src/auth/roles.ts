import { ROLES } from "../constants";

// The portal's roles. What each may do is Better Auth's access control, in
// @pkg/auth/permissions.
export const USER_ROLES = ROLES;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const enum ROLES {
  ADMIN = "admin",
  MANAGER = "manager",
  /** @deprecated Split into OFFICE_OPERATOR / SITE_OPERATOR. Migration-window only. */
  OPERATOR = "operator",
  OFFICE_OPERATOR = "office_operator",
  SITE_OPERATOR = "site_operator",
  VIEWER = "viewer",
}

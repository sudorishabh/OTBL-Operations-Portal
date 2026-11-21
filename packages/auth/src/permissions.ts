// The portal's roles and what each may do, in Better Auth's access control.
// Shared by the server, which enforces it, and the web app, which uses it to
// show or hide what a user can't do. Free of server code, so it is safe to
// bundle in the browser.
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { constants } from "@pkg/utils";

const { ROLES } = constants;

// What can be done, resource by resource. `user` and `session` are Better
// Auth's own: managing accounts and their sign-ins.
export const statement = {
  ...defaultStatements,
  // The portal's records: clients, proposals, work orders, sites, expenses
  // and the rest. Which of them a user sees is narrowed by their offices and
  // sites, not here.
  records: ["read", "write"],
  // Sharing a document through a public link.
  documents: ["share"],
  // Setting the portal up: offices and their members, vendors and users.
  portal: ["administer"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  // Everything, including managing accounts. Banning and impersonation are
  // left out, as the portal has neither.
  [ROLES.ADMIN]: ac.newRole({
    user: ["create", "list", "set-role", "set-password", "get", "update"],
    session: ["list", "revoke"],
    records: ["read", "write"],
    documents: ["share"],
    portal: ["administer"],
  }),
  // Runs the work of their offices.
  [ROLES.OFFICE_OPERATOR]: ac.newRole({
    records: ["read", "write"],
    documents: ["share"],
  }),
  // Uploads at the work order sites they are put on.
  [ROLES.SITE_OPERATOR]: ac.newRole({
    records: ["read", "write"],
    documents: ["share"],
  }),
  // Sees, never changes.
  [ROLES.VIEWER]: ac.newRole({
    records: ["read"],
  }),
};

export type RoleName = keyof typeof roles;

export type Permissions = {
  [K in keyof typeof statement]?: (typeof statement)[K][number][];
};

// Whether a role may do every one of `permissions`.
export const can = (
  role: string | null | undefined,
  permissions: Permissions,
): boolean =>
  !!role &&
  role in roles &&
  roles[role as RoleName].authorize(permissions).success;

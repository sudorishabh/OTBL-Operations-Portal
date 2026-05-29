import { and, eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import type { Database } from "@pkg/db";
import { USER_ROLES } from "../authorization";
import {
  appErrorToTRPCError,
  createInsufficientPermissionsError,
  createUnauthorizedError,
} from "../errors";

const { officeUserTable } = schema;

/**
 * Office-scoped role of a user within a single office.
 *
 * NOTE: this is distinct from the *global* `users.role` carried on the JWT
 * (`ctx.user.role`). A user can be the manager of one office and merely an
 * operator (or nothing) in another. Office-level authority must therefore be
 * resolved per-office against `office_users`, not from the global role.
 */
export type OfficeRole = "manager" | "operator";

/**
 * Resolve a user's role within a specific office.
 * Returns `null` when the user is not a member of that office.
 */
export async function getOfficeRole(
  db: Database,
  userId: number,
  officeId: number,
): Promise<OfficeRole | null> {
  const rows = await db
    .select({ role: officeUserTable.role })
    .from(officeUserTable)
    .where(
      and(
        eq(officeUserTable.user_id, userId),
        eq(officeUserTable.office_id, officeId),
      ),
    )
    .limit(1);

  return (rows[0]?.role as OfficeRole | undefined) ?? null;
}

/** True when the user belongs to the office in any office-level role. */
export async function isOfficeMember(
  db: Database,
  userId: number,
  officeId: number,
): Promise<boolean> {
  return (await getOfficeRole(db, userId, officeId)) !== null;
}

/** True when the user is the manager of the given office. */
export async function isOfficeManager(
  db: Database,
  userId: number,
  officeId: number,
): Promise<boolean> {
  return (await getOfficeRole(db, userId, officeId)) === "manager";
}

type PermissionCtx = {
  db: Database;
  // `user` is typed as nullable on the mutation handler context even inside
  // protected procedures, so resolve and assert it here rather than relying
  // on a non-null assertion at every call site.
  user?: { sub: string; role: string } | null;
};

/** Narrow the possibly-null context user, throwing UNAUTHORIZED if absent. */
function requireUser(ctx: PermissionCtx): { sub: string; role: string } {
  if (!ctx.user?.sub) {
    throw appErrorToTRPCError(
      createUnauthorizedError("You must be logged in to perform this action.", {
        devMessage: "office-permissions guard reached without an authenticated user",
      }),
    );
  }
  return ctx.user;
}

/**
 * Guard: caller must be a global admin OR a member (manager/operator) of the
 * given office. Use for actions any office staff may perform — e.g. drafting
 * proposals and work orders. Throws a tRPC permission error otherwise.
 */
export async function assertOfficeMember(
  ctx: PermissionCtx,
  officeId: number,
): Promise<OfficeRole | "admin"> {
  const user = requireUser(ctx);
  if (user.role === USER_ROLES.ADMIN) return "admin";

  const role = await getOfficeRole(ctx.db, parseInt(user.sub), officeId);
  if (!role) {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError("a member of this office", {
        userMessage: "You don't have access to this office.",
        devMessage: `User ${user.sub} is not a member of office ${officeId}`,
      }),
    );
  }
  return role;
}

/**
 * Guard: caller must be a global admin OR the manager of the given office.
 * Use for authority actions — approving / rejecting / cancelling. Office
 * operators are intentionally rejected here so the draft/approve split is
 * enforced server-side, not just in the UI. Throws otherwise.
 */
export async function assertOfficeManager(
  ctx: PermissionCtx,
  officeId: number,
): Promise<void> {
  const user = requireUser(ctx);
  if (user.role === USER_ROLES.ADMIN) return;

  const role = await getOfficeRole(ctx.db, parseInt(user.sub), officeId);
  if (role !== "manager") {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError("the manager of this office", {
        userMessage:
          "Only this office's manager can approve or change this status.",
        devMessage: `User ${user.sub} has office role "${role ?? "none"}" for office ${officeId}; manager required`,
      }),
    );
  }
}

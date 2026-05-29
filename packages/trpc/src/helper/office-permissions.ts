import { and, eq } from "drizzle-orm";
import { schema } from "@pkg/db";
import type { Database } from "@pkg/db";
import { USER_ROLES } from "../authorization";
import {
  appErrorToTRPCError,
  createInsufficientPermissionsError,
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
  user: { sub: string; role: string };
};

/**
 * Guard: caller must be a global admin OR a member (manager/operator) of the
 * given office. Use for actions any office staff may perform — e.g. drafting
 * proposals and work orders. Throws a tRPC permission error otherwise.
 */
export async function assertOfficeMember(
  ctx: PermissionCtx,
  officeId: number,
): Promise<OfficeRole | "admin"> {
  if (ctx.user.role === USER_ROLES.ADMIN) return "admin";

  const role = await getOfficeRole(ctx.db, parseInt(ctx.user.sub), officeId);
  if (!role) {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError("a member of this office", {
        userMessage: "You don't have access to this office.",
        devMessage: `User ${ctx.user.sub} is not a member of office ${officeId}`,
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
  if (ctx.user.role === USER_ROLES.ADMIN) return;

  const role = await getOfficeRole(ctx.db, parseInt(ctx.user.sub), officeId);
  if (role !== "manager") {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError("the manager of this office", {
        userMessage:
          "Only this office's manager can approve or change this status.",
        devMessage: `User ${ctx.user.sub} has office role "${role ?? "none"}" for office ${officeId}; manager required`,
      }),
    );
  }
}

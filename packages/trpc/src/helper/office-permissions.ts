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

export type OfficeRole = "office_manager" | "operator";

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

export async function isOfficeMember(
  db: Database,
  userId: number,
  officeId: number,
): Promise<boolean> {
  return (await getOfficeRole(db, userId, officeId)) !== null;
}

export async function isOfficeManager(
  db: Database,
  userId: number,
  officeId: number,
): Promise<boolean> {
  return (await getOfficeRole(db, userId, officeId)) === "office_manager";
}

type PermissionCtx = {
  db: Database;
  user?: { sub: string; role: string } | null;
};

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

export async function assertOfficeManager(
  ctx: PermissionCtx,
  officeId: number,
): Promise<void> {
  const user = requireUser(ctx);
  if (user.role === USER_ROLES.ADMIN) return;

  const role = await getOfficeRole(ctx.db, parseInt(user.sub), officeId);
  if (role !== "office_manager") {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError("the manager of this office", {
        userMessage:
          "Only this office's manager can approve or change this status.",
        devMessage: `User ${user.sub} has office role "${role ?? "none"}" for office ${officeId}; manager required`,
      }),
    );
  }
}

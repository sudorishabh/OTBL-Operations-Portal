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

// Everyone seated at an office is one of its office operators.
export async function isOfficeMember(
  db: Database,
  userId: number,
  officeId: number,
): Promise<boolean> {
  const rows = await db
    .select({ id: officeUserTable.id })
    .from(officeUserTable)
    .where(
      and(
        eq(officeUserTable.user_id, userId),
        eq(officeUserTable.office_id, officeId),
      ),
    )
    .limit(1);

  return rows.length > 0;
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

// The office's own operators run its day-to-day work; admins can too.
export async function assertOfficeMember(
  ctx: PermissionCtx,
  officeId: number,
): Promise<void> {
  const user = requireUser(ctx);
  if (user.role === USER_ROLES.ADMIN) return;

  if (!(await isOfficeMember(ctx.db, parseInt(user.sub), officeId))) {
    throw appErrorToTRPCError(
      createInsufficientPermissionsError("a member of this office", {
        userMessage: "Only this office's operators and admins can do this.",
        devMessage: `User ${user.sub} is not a member of office ${officeId}`,
      }),
    );
  }
}

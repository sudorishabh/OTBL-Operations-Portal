import { getAccessScope } from "../../access-scope";
import { USER_ROLES } from "../../authorization";
import { forbidden } from "../../errors";
import type { TrpcContext } from "../../context";

// Vendors are shared by every office. Office members and admins see and add
// them; site operators, who never record expenses, don't.
export async function canUseVendors(ctx: TrpcContext) {
  const scope = await getAccessScope(
    ctx.db,
    Number(ctx.user!.sub),
    ctx.user!.role,
  );
  return scope.kind === "full" || scope.ui === "office";
}

export async function assertCanUseVendors(ctx: TrpcContext) {
  if (!(await canUseVendors(ctx))) {
    throw forbidden("use vendors", {
      userMessage: "You don't have access to vendors.",
    });
  }
}

// Editing or deleting a vendor changes it for every office, so only admins
// and office managers can.
export function assertCanManageVendors(ctx: TrpcContext) {
  const role = ctx.user!.role;
  if (role !== USER_ROLES.ADMIN && role !== USER_ROLES.MANAGER) {
    throw forbidden("change vendors", {
      userMessage: "Only admins and office managers can change vendors.",
    });
  }
}

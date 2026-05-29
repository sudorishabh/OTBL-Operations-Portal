import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "@pkg/db";
import { schema } from "@pkg/db";
import type { UserRole } from "@pkg/utils/auth";
import { USER_ROLES } from "@pkg/utils/auth";
import { forbidden, notFound } from "./errors";

const {
  officeUserTable,
  siteUserTable,
  workOrderSiteTable,
  workOrderSiteUserTable,
  workOrderTable,
  proposalTable,
} = schema;

/** Unrestricted data access (no office filter). Managers/operators must be in `office_users` to see office-scoped data; they are not listed here so unassigned managers do not see all offices. Viewer is read-only but sees everything (writes are blocked separately by middleware). */
const FULL_ACCESS_ROLES: UserRole[] = [USER_ROLES.ADMIN, USER_ROLES.VIEWER];

/** How the dashboard should present: full nav, office-scoped nav, WO-site upload only, or no nav. */
export type DashboardUi =
  | { mode: "full" }
  | { mode: "office" }
  | { mode: "wo_site_upload"; workOrderSiteIds: number[]; defaultWorkOrderSiteId: number | null }
  | { mode: "site_only" };

export type AccessScope =
  | { kind: "full" }
  | {
      kind: "restricted";
      ui: "site_only" | "wo_site_upload" | "office";
      officeIds: number[];
      workOrderIdsFromSiteAssignment: number[];
      workOrderSiteIds: number[];
    };

export function getDashboardUi(scope: AccessScope): DashboardUi {
  if (scope.kind === "full") return { mode: "full" };
  if (scope.kind === "restricted" && scope.ui === "site_only") {
    return { mode: "site_only" };
  }
  if (scope.kind === "restricted" && scope.ui === "wo_site_upload") {
    const first = scope.workOrderSiteIds[0];
    return {
      mode: "wo_site_upload",
      workOrderSiteIds: scope.workOrderSiteIds,
      defaultWorkOrderSiteId: first ?? null,
    };
  }
  return { mode: "office" };
}

export async function getAccessScope(
  db: Database,
  userId: number,
  globalRole: UserRole,
): Promise<AccessScope> {
  if (globalRole === USER_ROLES.ADMIN || globalRole === USER_ROLES.VIEWER) {
    return { kind: "full" };
  }

  const officeRows = await db
    .select({ office_id: officeUserTable.office_id })
    .from(officeUserTable)
    .where(eq(officeUserTable.user_id, userId));

  const officeIds = [...new Set(officeRows.map((r) => r.office_id))];

  // Upload access is granted per work-order-site via workOrderSiteUserTable.
  // A WO-site row belongs to exactly one work order, so this scopes the
  // operator to the specific work-order-site(s) they were assigned to — not to
  // every WO-site that happens to reuse the same master site across unrelated
  // work orders.
  const directWoSiteRows = await db
    .select({
      wosId: workOrderSiteTable.id,
      woId: workOrderSiteTable.work_order_id,
    })
    .from(workOrderSiteUserTable)
    .innerJoin(
      workOrderSiteTable,
      eq(
        workOrderSiteUserTable.work_order_site_id,
        workOrderSiteTable.id,
      ),
    )
    .where(eq(workOrderSiteUserTable.user_id, userId));

  // Master-site assignment (siteUserTable) no longer auto-grants upload access
  // to every WO-site at that site — that over-granted across unrelated work
  // orders. It now only marks the operator as eligible to be assigned to a
  // specific WO-site (see setWorkOrderSiteOperators) and acts as the
  // empty-dashboard fallback below.
  const siteAssignmentRows = await db
    .select({ siteId: siteUserTable.site_id })
    .from(siteUserTable)
    .where(eq(siteUserTable.user_id, userId));

  const hasSiteAssignment = siteAssignmentRows.length > 0;

  const mergedWoSites = new Map<number, number>();
  for (const r of directWoSiteRows) {
    mergedWoSites.set(r.wosId, r.woId);
  }
  const workOrderSiteIds = [...mergedWoSites.keys()];
  const workOrderIdsFromSiteAssignment = [
    ...new Set(mergedWoSites.values()),
  ];

  if (workOrderSiteIds.length > 0) {
    return {
      kind: "restricted",
      ui: "wo_site_upload",
      officeIds: [],
      workOrderIdsFromSiteAssignment,
      workOrderSiteIds,
    };
  }

  if (officeIds.length > 0) {
    return {
      kind: "restricted",
      ui: "office",
      officeIds,
      workOrderIdsFromSiteAssignment: [],
      workOrderSiteIds: [],
    };
  }

  if (hasSiteAssignment) {
    return {
      kind: "restricted",
      ui: "site_only",
      officeIds: [],
      workOrderIdsFromSiteAssignment: [],
      workOrderSiteIds: [],
    };
  }

  if (FULL_ACCESS_ROLES.includes(globalRole)) {
    return { kind: "full" };
  }

  return {
    kind: "restricted",
    ui: "site_only",
    officeIds: [],
    workOrderIdsFromSiteAssignment: [],
    workOrderSiteIds: [],
  };
}

/** Offices visible: office assignment, or offices of work orders tied to WO-site rows. */
export async function resolveVisibleOfficeIds(
  db: Database,
  scope: AccessScope,
): Promise<number[] | null> {
  if (scope.kind === "full") return null;
  if (scope.kind === "restricted" && scope.ui === "site_only") return [];

  if (scope.kind === "restricted" && scope.ui === "office") {
    return [...scope.officeIds];
  }

  const set = new Set(scope.officeIds);
  if (scope.workOrderIdsFromSiteAssignment.length > 0) {
    const rows = await db
      .select({ office_id: workOrderTable.office_id })
      .from(workOrderTable)
      .where(
        inArray(workOrderTable.id, scope.workOrderIdsFromSiteAssignment),
      );
    rows.forEach((r) => set.add(r.office_id));
  }
  return [...set];
}

export function workOrderScopeWhere(scope: AccessScope): SQL | undefined {
  if (scope.kind === "full") return undefined;
  if (scope.kind === "restricted" && scope.ui === "site_only") {
    return sql`0=1`;
  }

  const parts: SQL[] = [];

  if (scope.kind === "restricted" && scope.ui === "office" && scope.officeIds.length > 0) {
    parts.push(inArray(workOrderTable.office_id, scope.officeIds));
  }

  if (scope.kind === "restricted" && scope.ui === "wo_site_upload") {
    if (scope.workOrderIdsFromSiteAssignment.length > 0) {
      parts.push(
        inArray(workOrderTable.id, scope.workOrderIdsFromSiteAssignment),
      );
    }
  }

  if (parts.length === 0) return sql`0=1`;
  return parts.length === 1 ? parts[0]! : or(...parts)!;
}

export async function proposalIdsVisibleToScope(
  db: Database,
  scope: AccessScope,
): Promise<number[] | null> {
  if (scope.kind === "full") return null;
  if (scope.kind === "restricted" && scope.ui === "site_only") return [];

  const ids = new Set<number>();
  if (scope.officeIds.length > 0) {
    const rows = await db
      .select({ id: proposalTable.id })
      .from(proposalTable)
      .where(inArray(proposalTable.office_id, scope.officeIds));
    rows.forEach((r) => ids.add(r.id));
  }
  if (scope.workOrderIdsFromSiteAssignment.length > 0) {
    const rows = await db
      .select({ proposal_id: workOrderTable.proposal_id })
      .from(workOrderTable)
      .where(
        inArray(workOrderTable.id, scope.workOrderIdsFromSiteAssignment),
      );
    rows.forEach((r) => ids.add(r.proposal_id));
  }
  return [...ids];
}

export async function clientIdsVisibleToScope(
  db: Database,
  scope: AccessScope,
): Promise<number[] | null> {
  if (scope.kind === "full") return null;
  if (scope.kind === "restricted" && scope.ui === "site_only") return [];

  const ids = new Set<number>();
  if (scope.officeIds.length > 0) {
    const rows = await db
      .select({ client_id: workOrderTable.client_id })
      .from(workOrderTable)
      .where(inArray(workOrderTable.office_id, scope.officeIds));
    rows.forEach((r) => ids.add(r.client_id));

    const proposalClients = await db
      .select({ client_id: proposalTable.client_id })
      .from(proposalTable)
      .where(inArray(proposalTable.office_id, scope.officeIds));
    proposalClients.forEach((r) => ids.add(r.client_id));
  }
  if (scope.workOrderIdsFromSiteAssignment.length > 0) {
    const rows = await db
      .select({ client_id: workOrderTable.client_id })
      .from(workOrderTable)
      .where(
        inArray(workOrderTable.id, scope.workOrderIdsFromSiteAssignment),
      );
    rows.forEach((r) => ids.add(r.client_id));
  }
  return [...ids];
}

export async function assertCanAccessWorkOrder(
  db: Database,
  scope: AccessScope,
  workOrderId: number,
): Promise<void> {
  if (scope.kind === "full") return;

  if (scope.kind === "restricted" && scope.ui === "site_only") {
    throw forbidden("access this work order");
  }

  const [wo] = await db
    .select({ id: workOrderTable.id, office_id: workOrderTable.office_id })
    .from(workOrderTable)
    .where(eq(workOrderTable.id, workOrderId))
    .limit(1);
  if (!wo) {
    throw notFound("Work order", workOrderId);
  }

  if (scope.kind === "restricted" && scope.ui === "wo_site_upload") {
    if (scope.workOrderIdsFromSiteAssignment.includes(wo.id)) return;
    throw forbidden("access this work order");
  }

  if (scope.kind === "restricted" && scope.ui === "office") {
    if (scope.officeIds.includes(wo.office_id)) return;
    throw forbidden("access this work order");
  }
}

export async function assertCanAccessWorkOrderSite(
  db: Database,
  scope: AccessScope,
  workOrderSiteId: number,
): Promise<void> {
  if (scope.kind === "full") return;

  if (scope.kind === "restricted" && scope.ui === "site_only") {
    throw forbidden("access this work order site");
  }

  const [row] = await db
    .select({
      id: workOrderSiteTable.id,
      office_id: workOrderTable.office_id,
    })
    .from(workOrderSiteTable)
    .innerJoin(
      workOrderTable,
      eq(workOrderSiteTable.work_order_id, workOrderTable.id),
    )
    .where(eq(workOrderSiteTable.id, workOrderSiteId))
    .limit(1);
  if (!row) {
    throw notFound("Work order site", workOrderSiteId);
  }

  if (scope.kind === "restricted" && scope.ui === "wo_site_upload") {
    if (scope.workOrderSiteIds.includes(row.id)) return;
    throw forbidden("access this work order site");
  }

  if (scope.kind === "restricted" && scope.ui === "office") {
    if (scope.officeIds.includes(row.office_id)) return;
    throw forbidden("access this work order site");
  }
}

export async function assertCanAccessOffice(
  db: Database,
  scope: AccessScope,
  officeId: number,
): Promise<void> {
  if (scope.kind === "full") return;

  if (scope.kind === "restricted" && scope.ui === "site_only") {
    throw forbidden("access this office");
  }

  const allowed = await resolveVisibleOfficeIds(db, scope);
  if (allowed?.includes(officeId)) return;
  throw forbidden("access this office");
}

export async function assertCanAccessClient(
  db: Database,
  scope: AccessScope,
  clientId: number,
): Promise<void> {
  if (scope.kind === "full") return;

  if (scope.kind === "restricted" && scope.ui === "site_only") {
    throw forbidden("access this client");
  }

  const allowed = await clientIdsVisibleToScope(db, scope);
  if (allowed?.includes(clientId)) return;
  throw forbidden("access this client");
}

export async function assertCanAccessProposal(
  db: Database,
  scope: AccessScope,
  proposalId: number,
): Promise<void> {
  if (scope.kind === "full") return;

  if (scope.kind === "restricted" && scope.ui === "site_only") {
    throw forbidden("access this proposal");
  }

  const [p] = await db
    .select({
      id: proposalTable.id,
      office_id: proposalTable.office_id,
    })
    .from(proposalTable)
    .where(eq(proposalTable.id, proposalId))
    .limit(1);
  if (!p) {
    throw notFound("Proposal", proposalId);
  }
  if (scope.officeIds.includes(p.office_id)) return;
  if (scope.workOrderIdsFromSiteAssignment.length === 0) {
    throw forbidden("access this proposal");
  }
  const linked = await db
    .select({ id: workOrderTable.id })
    .from(workOrderTable)
    .where(
      and(
        eq(workOrderTable.proposal_id, proposalId),
        inArray(
          workOrderTable.id,
          scope.workOrderIdsFromSiteAssignment,
        ),
      ),
    )
    .limit(1);
  if (linked.length > 0) return;
  throw forbidden("access this proposal");
}

/** Merge scope filter with existing WHERE fragments (AND). */
export function andScope(
  base: SQL | undefined,
  scopeSql: SQL | undefined,
): SQL | undefined {
  if (!scopeSql) return base;
  if (!base) return scopeSql;
  return and(base, scopeSql);
}

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  isNull,
  like,
  or,
  type SQL,
} from "drizzle-orm";
import { schema, type Database } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  type AccessScope,
  assertCanAccessClient,
  clientIdsVisibleToScope,
  getAccessScope,
} from "../../access-scope";
import { clientSchemas } from "@pkg/schema";
import { notFound, fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { buildPagination, pageOffset } from "../../helper/pagination";
import { hasPhysicalSite } from "../../helper/restoration";
import { batchEffectiveWorkOrderStatuses } from "../work-order/batch-effective-work-order-status";
import { effectiveWorkOrderStatusFromDbOnly } from "@pkg/utils";

const {
  parentClientTable,
  clientTable,
  clientContactTable,
  workOrderTable,
  workOrderSiteTable,
  proposalTable,
  scheduleOfRatesTable,
  bioremediationContSoilTable
} = schema;

type ClientSort = "name_asc" | "name_desc" | "newest" | "oldest";

type ClientListFilters = {
  searchQuery?: string;
  status?: "all" | "active" | "inactive";
  parentClientId?: number | "none";
  state?: string;
};

// The clients a list shows: its search and filters, within what the user may
// see. The search also matches the main client's name, so queries using this
// must join parentClientTable.
const clientListWhere = (
  { searchQuery, status, parentClientId, state }: ClientListFilters,
  scope: AccessScope,
  clientIds: number[] | null,
) => {
  const term = searchQuery ? `%${escapeLike(searchQuery)}%` : undefined;

  return and(
    status && status !== "all" ? eq(clientTable.status, status) : undefined,
    parentClientId === "none"
      ? isNull(clientTable.parent_client_id)
      : parentClientId
        ? eq(clientTable.parent_client_id, parentClientId)
        : undefined,
    state ? eq(clientTable.state, state) : undefined,
    term
      ? or(
          like(clientTable.name, term),
          like(clientTable.email, term),
          like(clientTable.gst_number, term),
          like(clientTable.city, term),
          like(clientTable.contact_number, term),
          like(parentClientTable.name, term),
        )
      : undefined,
    scope.kind === "restricted"
      ? clientIds && clientIds.length > 0
        ? inArray(clientTable.id, clientIds)
        : eq(clientTable.id, -1)
      : undefined,
  );
};

// Main clients by name or by when they were added; ids break ties so pages
// never repeat or skip one.
const parentClientOrder = (sort: ClientSort | undefined) => {
  switch (sort) {
    case "name_desc":
      return [desc(parentClientTable.name), desc(parentClientTable.id)];
    case "newest":
      return [desc(parentClientTable.created_at), desc(parentClientTable.id)];
    case "oldest":
      return [asc(parentClientTable.created_at), asc(parentClientTable.id)];
    default:
      return [asc(parentClientTable.name), asc(parentClientTable.id)];
  }
};

// Branches and clients without a main client; newest first unless sorted.
const clientOrder = (sort: ClientSort | undefined) => {
  switch (sort) {
    case "name_asc":
      return [asc(clientTable.name), asc(clientTable.id)];
    case "name_desc":
      return [desc(clientTable.name), desc(clientTable.id)];
    case "oldest":
      return [asc(clientTable.created_at), asc(clientTable.id)];
    default:
      return [desc(clientTable.created_at), desc(clientTable.id)];
  }
};

type WithClientCounts<T> = T & {
  contacts_count: number;
  work_order_number: number;
  proposal_number: number;
  sites_work_done: number;
};

// Adds the counts each client row on the clients list shows.
const withClientCounts = async <T extends { id: number }>(
  db: Database,
  clients: T[],
): Promise<WithClientCounts<T>[]> => {
  if (clients.length === 0) return [];

  const ids = clients.map((c) => c.id);

  const [contactCounts, workOrderCounts, proposalCounts, siteCounts] =
    await Promise.all([
      db
        .select({ client_id: clientContactTable.client_id, cnt: count() })
        .from(clientContactTable)
        .where(inArray(clientContactTable.client_id, ids))
        .groupBy(clientContactTable.client_id),
      db
        .select({ client_id: workOrderTable.client_id, cnt: count() })
        .from(workOrderTable)
        .where(inArray(workOrderTable.client_id, ids))
        .groupBy(workOrderTable.client_id),
      db
        .select({ client_id: proposalTable.client_id, cnt: count() })
        .from(proposalTable)
        .where(inArray(proposalTable.client_id, ids))
        .groupBy(proposalTable.client_id),
      db
        .select({
          client_id: workOrderTable.client_id,
          cnt: count(workOrderSiteTable.id),
        })
        .from(workOrderTable)
        .leftJoin(
          workOrderSiteTable,
          and(
            eq(workOrderSiteTable.work_order_id, workOrderTable.id),
            hasPhysicalSite,
          ),
        )
        .where(inArray(workOrderTable.client_id, ids))
        .groupBy(workOrderTable.client_id),
    ]);

  const contactMap = new Map(contactCounts.map((r) => [r.client_id, r.cnt]));
  const workOrderMap = new Map(
    workOrderCounts.map((r) => [r.client_id, r.cnt]),
  );
  const proposalMap = new Map(proposalCounts.map((r) => [r.client_id, r.cnt]));
  const siteMap = new Map(siteCounts.map((r) => [r.client_id, r.cnt]));

  return clients.map((client) => ({
    ...client,
    contacts_count: contactMap.get(client.id) ?? 0,
    work_order_number: workOrderMap.get(client.id) ?? 0,
    proposal_number: proposalMap.get(client.id) ?? 0,
    sites_work_done: siteMap.get(client.id) ?? 0,
  }));
};

export const clientQueryRouter = router({
  // Restricted users only see main clients that have a branch visible to them.
  getParentClients: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role,
      );
      const clientIds = await clientIdsVisibleToScope(ctx.db, scope);

      try {
        if (scope.kind === "full") {
          return await ctx.db
            .select({ id: parentClientTable.id, name: parentClientTable.name })
            .from(parentClientTable)
            .orderBy(asc(parentClientTable.name));
        }

        if (!clientIds || clientIds.length === 0) return [];

        return await ctx.db
          .selectDistinct({
            id: parentClientTable.id,
            name: parentClientTable.name,
          })
          .from(parentClientTable)
          .innerJoin(
            clientTable,
            eq(clientTable.parent_client_id, parentClientTable.id),
          )
          .where(inArray(clientTable.id, clientIds))
          .orderBy(asc(parentClientTable.name));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching main clients");
      }
    }),
  ),

  // Every client the user can see, with only what list filters show and
  // search by; also gives the states clients are in.
  getClientOptions: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role,
      );
      const clientIds = await clientIdsVisibleToScope(ctx.db, scope);

      try {
        return await ctx.db
          .select({
            id: clientTable.id,
            name: clientTable.name,
            city: clientTable.city,
            state: clientTable.state,
            parent_client_name: parentClientTable.name,
          })
          .from(clientTable)
          .leftJoin(
            parentClientTable,
            eq(parentClientTable.id, clientTable.parent_client_id),
          )
          .where(clientListWhere({}, scope, clientIds))
          .orderBy(asc(clientTable.name), asc(clientTable.id));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching client options");
      }
    }),
  ),

  totalClientAndContact: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        const clientIds = await clientIdsVisibleToScope(ctx.db, scope);

        if (scope.kind === "restricted" && (!clientIds || clientIds.length === 0)) {
          return { totalClients: 0, totalContacts: 0 };
        }

        const clientWhere =
          scope.kind === "full"
            ? undefined
            : clientIds && clientIds.length > 0
              ? inArray(clientTable.id, clientIds)
              : eq(clientTable.id, -1);

        const clientsResult = await ctx.db
          .select({ count: count() })
          .from(clientTable)
          .where(clientWhere);

        const contactWhere =
          scope.kind === "full"
            ? undefined
            : clientIds && clientIds.length > 0
              ? inArray(clientContactTable.client_id, clientIds)
              : eq(clientContactTable.client_id, -1);

        const contactsResult = await ctx.db
          .select({ count: count() })
          .from(clientContactTable)
          .where(contactWhere);

        return {
          totalClients: clientsResult[0]?.count ?? 0,
          totalContacts: contactsResult[0]?.count ?? 0,
        };
      } catch (error) {
        throw fromDatabaseError(error, "Fetching client and contact counts");
      }
    }),
  ),

  getClients: protectedProcedure.input(clientSchemas.getAllClientsSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role,
      );
      const clientIds = await clientIdsVisibleToScope(ctx.db, scope);
      const clientQuery = clientListWhere(input, scope, clientIds);

      try {
        const clients = await ctx.db
          .select({
            ...getTableColumns(clientTable),
            parent_client_name: parentClientTable.name,
          })
          .from(clientTable)
          .leftJoin(
            parentClientTable,
            eq(parentClientTable.id, clientTable.parent_client_id),
          )
          .where(clientQuery)
          .orderBy(desc(clientTable.created_at));

        return await withClientCounts(ctx.db, clients);
      } catch (error) {
        throw fromDatabaseError(error, "Fetching clients");
      }
    }),
  ),

  // The clients page, paged so a main client always arrives with all of its
  // branches: main clients by name first, then clients without one.
  getClientGroups: protectedProcedure
    .input(clientSchemas.getClientGroupsSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { page, limit, searchQuery, status, parentClientId, state, sort } =
          input;
        const isFiltered =
          !!searchQuery ||
          (!!status && status !== "all") ||
          !!parentClientId ||
          !!state;

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        const clientIds = await clientIdsVisibleToScope(ctx.db, scope);
        const clientWhere = clientListWhere(input, scope, clientIds);
        const standaloneWhere = and(
          clientWhere,
          isNull(clientTable.parent_client_id),
        );

        const listClients = (where: SQL | undefined) =>
          ctx.db
            .select({
              ...getTableColumns(clientTable),
              parent_client_name: parentClientTable.name,
            })
            .from(clientTable)
            .leftJoin(
              parentClientTable,
              eq(parentClientTable.id, clientTable.parent_client_id),
            )
            .where(where);

        const countClients = async (where: SQL | undefined) => {
          const [row] = await ctx.db
            .select({ count: count() })
            .from(clientTable)
            .leftJoin(
              parentClientTable,
              eq(parentClientTable.id, clientTable.parent_client_id),
            )
            .where(where);
          return row?.count ?? 0;
        };

        try {
          // Main clients are few, so all of them are read and sliced here.
          // Unfiltered, a full-access user also sees ones without branches.
          // created_at is selected as DISTINCT can only order by its columns.
          const parentColumns = {
            id: parentClientTable.id,
            name: parentClientTable.name,
            created_at: parentClientTable.created_at,
          };
          const parentClients =
            scope.kind === "full" && !isFiltered
              ? await ctx.db
                  .select(parentColumns)
                  .from(parentClientTable)
                  .orderBy(...parentClientOrder(sort))
              : await ctx.db
                  .selectDistinct(parentColumns)
                  .from(parentClientTable)
                  .innerJoin(
                    clientTable,
                    eq(clientTable.parent_client_id, parentClientTable.id),
                  )
                  .where(clientWhere)
                  .orderBy(...parentClientOrder(sort));

          const offset = pageOffset(page, limit);
          const pageParents = parentClients.slice(offset, offset + limit);
          const standaloneLimit = limit - pageParents.length;
          const standaloneOffset = Math.max(0, offset - parentClients.length);

          const branchRows =
            pageParents.length === 0
              ? []
              : await listClients(
                  and(
                    clientWhere,
                    inArray(
                      clientTable.parent_client_id,
                      pageParents.map((parent) => parent.id),
                    ),
                  ),
                ).orderBy(...clientOrder(sort));

          const standaloneRows =
            standaloneLimit === 0
              ? []
              : await listClients(standaloneWhere)
                  .orderBy(...clientOrder(sort))
                  .limit(standaloneLimit)
                  .offset(standaloneOffset);

          const [standaloneTotal, totalClients, clients] = await Promise.all([
            countClients(standaloneWhere),
            countClients(clientWhere),
            withClientCounts(ctx.db, [...branchRows, ...standaloneRows]),
          ]);

          return {
            groups: pageParents.map(({ id, name }) => ({
              parentClient: { id, name },
              branches: clients.filter(
                (client) => client.parent_client_id === id,
              ),
            })),
            standalone: clients.filter(
              (client) => client.parent_client_id === null,
            ),
            // Every client matching the filters, branches included.
            totalClients,
            totalStandalone: standaloneTotal,
            pagination: buildPagination({
              page,
              limit,
              total: parentClients.length + standaloneTotal,
              shown: pageParents.length + standaloneRows.length,
            }),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching client groups");
        }
      }),
    ),

  getClient: protectedProcedure.input(clientSchemas.getClientSchema).query(
    handleQuery(async ({ input, ctx }) => {
      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );

        const client = await ctx.db
          .select({
            ...getTableColumns(clientTable),
            parent_client_name: parentClientTable.name,
          })
          .from(clientTable)
          .leftJoin(
            parentClientTable,
            eq(parentClientTable.id, clientTable.parent_client_id),
          )
          .where(eq(clientTable.id, input.clientId));

        if (client.length === 0) {
          throw notFound("Client", input.clientId);
        }

        await assertCanAccessClient(ctx.db, scope, input.clientId);

        const clientUsers = await ctx.db
          .select()
          .from(clientContactTable)
          .where(eq(clientContactTable.client_id, input.clientId));

        let workOrderWhere = eq(workOrderTable.client_id, input.clientId);
        if (scope.kind === "restricted" && scope.ui === "office") {
          if (scope.officeIds.length > 0) {
            workOrderWhere = and(
              workOrderWhere,
              inArray(workOrderTable.office_id, scope.officeIds),
            )!;
          }
        } else if (
          scope.kind === "restricted" &&
          scope.ui === "wo_site_upload" &&
          scope.workOrderIdsFromSiteAssignment.length > 0
        ) {
          workOrderWhere = and(
            workOrderWhere,
            inArray(workOrderTable.id, scope.workOrderIdsFromSiteAssignment),
          )!;
        }

        const workOrders = await ctx.db
          .select({
            id: workOrderTable.id,
            office_id: workOrderTable.office_id,
            status: workOrderTable.status,
          })
          .from(workOrderTable)
          .where(workOrderWhere);

        const workOrderIds = workOrders.map((w) => w.id);

        const effectiveByWo = await batchEffectiveWorkOrderStatuses(
          ctx.db,
          scope,
          workOrders.map((wo) => ({
            id: Number(wo.id),
            office_id: wo.office_id ?? null,
            status: String(wo.status ?? ""),
          })),
        );
        const completedWorkOrders = workOrders.filter((wo) => {
          const effective =
            effectiveByWo.get(Number(wo.id)) ??
            effectiveWorkOrderStatusFromDbOnly(String(wo.status));
          return effective === "completed";
        }).length;

        let siteCount = 0;
        let totalBudgetAmount = 0;
        let totalExpenseAmount = 0;

        if (workOrderIds.length > 0) {
          const woSites = await ctx.db
            .select({
              id: workOrderSiteTable.id,
              site_id: workOrderSiteTable.site_id,
            })
            .from(workOrderSiteTable)
            .where(inArray(workOrderSiteTable.work_order_id, workOrderIds));

          siteCount = woSites.filter((s) => s.site_id != null).length;

          const sors = await ctx.db
            .select({ total_cost: scheduleOfRatesTable.total_cost })
            .from(scheduleOfRatesTable)
            .where(inArray(scheduleOfRatesTable.work_order_id, workOrderIds));

          totalBudgetAmount = sors.reduce((acc, curr) => acc + Number(curr.total_cost || 0), 0);

          if (woSites.length > 0) {
            const woSiteIds = woSites.map(s => s.id);
            // Only bioremediation completion earns income; restoration
            // tracks its expenses alone.
            const bioremSoilExp = await ctx.db
              .select({ amount: bioremediationContSoilTable.amount })
              .from(bioremediationContSoilTable)
              .where(
                and(
                  inArray(bioremediationContSoilTable.work_order_site_id, woSiteIds),
                  eq(bioremediationContSoilTable.type, "completion" as any)
                )
              );

            totalExpenseAmount = bioremSoilExp.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
          }
        }

        return {
          client: client[0],
          clientUsers,
          siteCount,
          completedWorkOrders,
          totalBudgetAmount,
          totalExpenseAmount,
        };
      } catch (error) {
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Fetching client details");
      }
    }),
  ),

  getAllClientContacts: protectedProcedure
    .input(clientSchemas.getAllClientContactsSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { searchQuery, clientId, sort, page, limit } = input;

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        const clientIds = await clientIdsVisibleToScope(ctx.db, scope);

        if (
          scope.kind === "restricted" &&
          (!clientIds || clientIds.length === 0)
        ) {
          return {
            contacts: [],
            pagination: buildPagination({ page, limit, total: 0, shown: 0 }),
          };
        }

        let contactQuery = undefined;

        if (clientId && clientId !== "all") {
          contactQuery = eq(clientContactTable.client_id, parseInt(clientId));
        }

        if (searchQuery && searchQuery.trim() !== "") {
          const term = `%${escapeLike(searchQuery)}%`;
          const searchCondition = or(
            like(clientContactTable.name, term),
            like(clientContactTable.email, term),
            like(clientContactTable.contact_number, term),
            like(clientContactTable.designation, term),
            like(clientTable.name, term),
          );
          contactQuery = contactQuery
            ? and(contactQuery, searchCondition)
            : searchCondition;
        }

        if (scope.kind === "restricted" && clientIds) {
          const scopeFilter = inArray(clientContactTable.client_id, clientIds);
          contactQuery = contactQuery
            ? and(contactQuery, scopeFilter)
            : scopeFilter;
        }

        const contactOrder =
          sort === "oldest"
            ? [asc(clientContactTable.id)]
            : sort === "name_asc"
              ? [asc(clientContactTable.name), asc(clientContactTable.id)]
              : sort === "name_desc"
                ? [desc(clientContactTable.name), desc(clientContactTable.id)]
                : [desc(clientContactTable.id)];

        try {
          // The client is joined for its name, which the search matches too.
          const contactList = ctx.db
            .select({
              ...getTableColumns(clientContactTable),
              client_name: clientTable.name,
            })
            .from(clientContactTable)
            .leftJoin(clientTable, eq(clientTable.id, clientContactTable.client_id))
            .where(contactQuery)
            .orderBy(...contactOrder);

          const contacts = page
            ? await contactList.limit(limit).offset(pageOffset(page, limit))
            : await contactList;

          let total = contacts.length;
          if (page) {
            const [totalResult] = await ctx.db
              .select({ count: count() })
              .from(clientContactTable)
              .leftJoin(clientTable, eq(clientTable.id, clientContactTable.client_id))
              .where(contactQuery);
            total = totalResult?.count ?? 0;
          }

          return {
            contacts,
            pagination: buildPagination({
              page,
              limit,
              total,
              shown: contacts.length,
            }),
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching client contacts");
        }
      }),
    ),

  getClientContacts: protectedProcedure
    .input(clientSchemas.getClientContactsSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessClient(ctx.db, scope, input.clientId);

          return await ctx.db
            .select()
            .from(clientContactTable)
            .where(eq(clientContactTable.client_id, input.clientId));
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error) {
            throw error;
          }
          throw fromDatabaseError(error, "Fetching client contacts");
        }
      }),
    ),

  getClientContact: protectedProcedure
    .input(clientSchemas.getClientContactSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        try {
          const contact = await ctx.db
            .select()
            .from(clientContactTable)
            .where(eq(clientContactTable.id, input.clientContactId));

          if (contact.length === 0) {
            throw notFound("Client contact", input.clientContactId);
          }

          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessClient(ctx.db, scope, contact[0]!.client_id);

          return contact[0];
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error) {
            throw error;
          }
          throw fromDatabaseError(error, "Fetching client contact");
        }
      }),
    ),

  getClientWithContacts: protectedProcedure
    .input(clientSchemas.getClientSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );

          const client = await ctx.db
            .select()
            .from(clientTable)
            .where(eq(clientTable.id, input.clientId));

          if (client.length === 0) {
            throw notFound("Client", input.clientId);
          }

          await assertCanAccessClient(ctx.db, scope, input.clientId);

          const contacts = await ctx.db
            .select()
            .from(clientContactTable)
            .where(eq(clientContactTable.client_id, input.clientId));

          return {
            client: client[0],
            contacts,
          };
        } catch (error) {
          if (error && typeof error === "object" && "errorCode" in error) {
            throw error;
          }
          throw fromDatabaseError(error, "Fetching client with contacts");
        }
      }),
    ),

  getClientsWithContacts: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        const clientIds = await clientIdsVisibleToScope(ctx.db, scope);

        if (
          scope.kind === "restricted" &&
          (!clientIds || clientIds.length === 0)
        ) {
          return [];
        }

        const clients = await ctx.db
          .select()
          .from(clientTable)
          .where(
            scope.kind === "full"
              ? undefined
              : inArray(clientTable.id, clientIds!),
          );

        const allContacts = await ctx.db
          .select()
          .from(clientContactTable)
          .where(
            scope.kind === "full"
              ? undefined
              : inArray(clientContactTable.client_id, clientIds!),
          );

        return clients.map((client: any) => ({
          ...client,
          contacts: allContacts.filter(
            (contact: any) => contact.client_id === client.id,
          ),
        }));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching clients with contacts");
      }
    }),
  ),
});

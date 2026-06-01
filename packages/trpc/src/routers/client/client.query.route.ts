import { and, count, desc, eq, inArray, like, or } from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessClient,
  clientIdsVisibleToScope,
  getAccessScope,
} from "../../access-scope";
import { clientSchemas } from "@pkg/schema";
import { notFound, fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { batchEffectiveWorkOrderStatuses } from "../work-order/batch-effective-work-order-status";
import { effectiveWorkOrderStatusFromDbOnly } from "@pkg/utils";

const {
  clientTable,
  clientContactTable,
  workOrderTable,
  workOrderSiteTable,
  proposalTable,
  scheduleOfRatesTable,
  cleaningUpSoilAreaTable,
  liftingRecoveryOilSlushTable,
  excavationContSoilTable,
  transportationContSoilTable,
  refillingExcavatedContSoilTable,
  bioremediationContSoilTable
} = schema;

export const clientQueryRouter = router({
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

  // Get all clients with pagination, search, and filters
  getClients: protectedProcedure.input(clientSchemas.getAllClientsSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { searchQuery, status } = input;

      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role,
      );
      const clientIds = await clientIdsVisibleToScope(ctx.db, scope);

      let clientQuery = undefined;

      if (status && status !== "all") {
        clientQuery = eq(clientTable.status, status);
      }

      if (searchQuery && searchQuery.trim() !== "") {
        const searchCondition = or(
          like(clientTable.name, `%${escapeLike(searchQuery)}%`),
          like(clientTable.email, `%${escapeLike(searchQuery)}%`),
          like(clientTable.gst_number, `%${escapeLike(searchQuery)}%`),
          like(clientTable.city, `%${escapeLike(searchQuery)}%`),
          like(clientTable.contact_number, `%${escapeLike(searchQuery)}%`),
        );
        clientQuery = clientQuery
          ? and(clientQuery, searchCondition)
          : searchCondition;
      }

      if (scope.kind === "restricted") {
        const scopeFilter =
          clientIds && clientIds.length > 0
            ? inArray(clientTable.id, clientIds)
            : eq(clientTable.id, -1);
        clientQuery = clientQuery
          ? and(clientQuery, scopeFilter)
          : scopeFilter;
      }

      try {
        const clients = await ctx.db
          .select()
          .from(clientTable)
          .where(clientQuery)
          .orderBy(desc(clientTable.created_at));

        if (clients.length === 0) return [];

        const ids = clients.map((c) => c.id);

        const [contactCounts, workOrderCounts, proposalCounts, siteCounts] =
          await Promise.all([
            ctx.db
              .select({ client_id: clientContactTable.client_id, cnt: count() })
              .from(clientContactTable)
              .where(inArray(clientContactTable.client_id, ids))
              .groupBy(clientContactTable.client_id),
            ctx.db
              .select({ client_id: workOrderTable.client_id, cnt: count() })
              .from(workOrderTable)
              .where(inArray(workOrderTable.client_id, ids))
              .groupBy(workOrderTable.client_id),
            ctx.db
              .select({ client_id: proposalTable.client_id, cnt: count() })
              .from(proposalTable)
              .where(inArray(proposalTable.client_id, ids))
              .groupBy(proposalTable.client_id),
            ctx.db
              .select({
                client_id: workOrderTable.client_id,
                cnt: count(workOrderSiteTable.id),
              })
              .from(workOrderTable)
              .leftJoin(
                workOrderSiteTable,
                eq(workOrderSiteTable.work_order_id, workOrderTable.id),
              )
              .where(inArray(workOrderTable.client_id, ids))
              .groupBy(workOrderTable.client_id),
          ]);

        const contactMap = new Map(contactCounts.map((r) => [r.client_id, r.cnt]));
        const workOrderMap = new Map(workOrderCounts.map((r) => [r.client_id, r.cnt]));
        const proposalMap = new Map(proposalCounts.map((r) => [r.client_id, r.cnt]));
        const siteMap = new Map(siteCounts.map((r) => [r.client_id, r.cnt]));

        return clients.map((client) => ({
          ...client,
          contacts_count: contactMap.get(client.id) ?? 0,
          work_order_number: workOrderMap.get(client.id) ?? 0,
          proposal_number: proposalMap.get(client.id) ?? 0,
          sites_work_done: siteMap.get(client.id) ?? 0,
        }));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching clients");
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
          .select()
          .from(clientTable)
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
            .select({ id: workOrderSiteTable.id })
            .from(workOrderSiteTable)
            .where(inArray(workOrderSiteTable.work_order_id, workOrderIds));

          siteCount = woSites.length;

          const sors = await ctx.db
            .select({ total_cost: scheduleOfRatesTable.total_cost })
            .from(scheduleOfRatesTable)
            .where(inArray(scheduleOfRatesTable.work_order_id, workOrderIds));
            
          totalBudgetAmount = sors.reduce((acc, curr) => acc + Number(curr.total_cost || 0), 0);

          if (woSites.length > 0) {
            const woSiteIds = woSites.map(s => s.id);
            const [
              cleanSoilAreaExp,
              liftingOilExp,
              excavSoilExp,
              transSoilExp,
              refillSoilExp,
              bioremSoilExp,
            ] = await Promise.all([
              ctx.db
                .select({ amount: cleaningUpSoilAreaTable.amount })
                .from(cleaningUpSoilAreaTable)
                .where(
                  and(
                    inArray(cleaningUpSoilAreaTable.work_order_site_id, woSiteIds),
                    eq(cleaningUpSoilAreaTable.type, "completion" as any)
                  )
                ),
              ctx.db
                .select({ amount: liftingRecoveryOilSlushTable.amount })
                .from(liftingRecoveryOilSlushTable)
                .where(
                  and(
                    inArray(liftingRecoveryOilSlushTable.work_order_site_id, woSiteIds),
                    eq(liftingRecoveryOilSlushTable.type, "completion" as any)
                  )
                ),
              ctx.db
                .select({ amount: excavationContSoilTable.amount })
                .from(excavationContSoilTable)
                .where(
                  and(
                    inArray(excavationContSoilTable.work_order_site_id, woSiteIds),
                    eq(excavationContSoilTable.type, "completion" as any)
                  )
                ),
              ctx.db
                .select({ amount: transportationContSoilTable.amount })
                .from(transportationContSoilTable)
                .where(
                  and(
                    inArray(transportationContSoilTable.work_order_site_id, woSiteIds),
                    eq(transportationContSoilTable.type, "completion" as any)
                  )
                ),
              ctx.db
                .select({ amount: refillingExcavatedContSoilTable.amount })
                .from(refillingExcavatedContSoilTable)
                .where(
                  and(
                    inArray(refillingExcavatedContSoilTable.work_order_site_id, woSiteIds),
                    eq(refillingExcavatedContSoilTable.type, "completion" as any)
                  )
                ),
              ctx.db
                .select({ amount: bioremediationContSoilTable.amount })
                .from(bioremediationContSoilTable)
                .where(
                  and(
                    inArray(bioremediationContSoilTable.work_order_site_id, woSiteIds),
                    eq(bioremediationContSoilTable.type, "completion" as any)
                  )
                ),
            ]);

            const allAmounts = [
              ...cleanSoilAreaExp,
              ...liftingOilExp,
              ...excavSoilExp,
              ...transSoilExp,
              ...refillSoilExp,
              ...bioremSoilExp,
            ];

            totalExpenseAmount = allAmounts.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
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
        // Re-throw AppError instances (like notFound)
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Fetching client details");
      }
    }),
  ),

  // Get all client contacts with pagination, search, and filters
  getAllClientContacts: protectedProcedure
    .input(clientSchemas.getAllClientContactsSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { searchQuery, clientId } = input;

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

        let contactQuery = undefined;

        if (clientId && clientId !== "all") {
          contactQuery = eq(clientContactTable.client_id, parseInt(clientId));
        }

        if (searchQuery && searchQuery.trim() !== "") {
          const searchCondition = or(
            like(clientContactTable.name, `%${escapeLike(searchQuery)}%`),
            like(clientContactTable.email, `%${escapeLike(searchQuery)}%`),
            like(clientContactTable.contact_number, `%${escapeLike(searchQuery)}%`),
            like(clientContactTable.designation, `%${escapeLike(searchQuery)}%`),
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

        try {
          return await ctx.db
            .select()
            .from(clientContactTable)
            .where(contactQuery)
            .orderBy(desc(clientContactTable.id));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching client contacts");
        }
      }),
    ),

  // Get contacts for a specific client
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

  // Get a single contact by ID
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
          // Re-throw AppError instances
          if (error && typeof error === "object" && "errorCode" in error) {
            throw error;
          }
          throw fromDatabaseError(error, "Fetching client contact");
        }
      }),
    ),

  // Get client with all their contacts
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
          // Re-throw AppError instances
          if (error && typeof error === "object" && "errorCode" in error) {
            throw error;
          }
          throw fromDatabaseError(error, "Fetching client with contacts");
        }
      }),
    ),

  // Get all clients with their contacts
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

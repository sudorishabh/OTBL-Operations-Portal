import {
  and,
  asc,
  count,
  desc,
  eq,
  like,
  or,
  inArray,
  not,
  sql,
  sum,
} from "drizzle-orm";
import { schema } from "@pkg/db";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  andScope,
  assertCanAccessClient,
  assertCanAccessOffice,
  assertCanAccessWorkOrder,
  getAccessScope,
  workOrderScopeWhere,
} from "../../access-scope";
import { workOrderSchemas } from "@pkg/schema";

const {
  getWorkOrderSchema,
  getWorkOrdersByOfficeSchema,
  getWorkOrdersByClientSchema,
  getAllWorkOrdersPaginatedSchema,
} = workOrderSchemas;

import { notFound, fromDatabaseError } from "../../errors";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { readTransportationSlabs } from "../../helper/transportation-slabs";
import {
  hasPhysicalSite,
  siteNameOrRestoration,
} from "../../helper/restoration";
import { USER_ROLES } from "../../authorization";
import {
  batchEffectiveWorkOrderStatuses,
  sorFullyConsumedSql,
} from "./batch-effective-work-order-status";
import { CODE_PREFIX, effectiveWorkOrderStatusFromDbOnly } from "@pkg/utils";
import { codeMatches } from "../../helper/record-code";

const {
  workOrderTable,
  workOrderSiteTable,
  workOrderSiteDocsTable,
  clientTable,
  parentClientTable,
  officeTable,
  siteTable,
  workOrderSiteUserTable,
  userTable,
  scheduleOfRatesTable,
  bioremediationContSoilTable,
  workOrderSiteExpenseTable,
} = schema;

export const workOrderQueryRouter = router({
  getAll: protectedProcedure.input(getAllWorkOrdersPaginatedSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const {
        page,
        limit,
        searchQuery,
        status,
        office_id,
        client_id,
        process_type,
        workOrderOrder,
      } = input;

      const scope = await getAccessScope(
        ctx.db,
        Number(ctx.user!.sub),
        ctx.user!.role,
      );
      const scopeWhere = workOrderScopeWhere(scope);

      let conditions: any = undefined;

      const statusFilter =
        status && status !== "all"
          ? (status as "pending" | "completed" | "cancelled")
          : undefined;
      const useEffectiveStatusFilter =
        statusFilter === "pending" || statusFilter === "completed";

      // A pending work order whose schedule of rates is used up counts as
      // completed. The database decides, so the list pages and counts there.
      if (statusFilter === "pending") {
        conditions = and(
          conditions,
          eq(workOrderTable.status, "pending"),
          not(sorFullyConsumedSql()),
        );
      } else if (statusFilter === "completed") {
        conditions = and(
          conditions,
          or(
            eq(workOrderTable.status, "completed"),
            and(eq(workOrderTable.status, "pending"), sorFullyConsumedSql()),
          ),
        );
      } else if (statusFilter) {
        conditions = and(conditions, eq(workOrderTable.status, statusFilter));
      }

      if (office_id) {
        conditions = and(conditions, eq(workOrderTable.office_id, office_id));
      }

      if (client_id) {
        conditions = and(conditions, eq(workOrderTable.client_id, client_id));
      }

      if (process_type) {
        conditions = and(
          conditions,
          eq(workOrderTable.process_type, process_type),
        );
      }

      if (searchQuery && searchQuery.trim() !== "") {
        conditions = and(
          conditions,
          or(
            like(workOrderTable.code, `%${escapeLike(searchQuery)}%`),
            like(
              workOrderTable.purchase_order_code,
              `%${escapeLike(searchQuery)}%`,
            ),
            like(
              workOrderTable.agreement_number,
              `%${escapeLike(searchQuery)}%`,
            ),
            like(clientTable.name, `%${escapeLike(searchQuery)}%`),
            like(officeTable.name, `%${escapeLike(searchQuery)}%`),
          ),
        );
      }

      conditions = andScope(conditions, scopeWhere);

      // The id breaks ties so work orders never repeat or go missing across
      // pages.
      const orderBy = [
        workOrderOrder === "latest"
          ? desc(workOrderTable.created_at)
          : workOrderOrder === "ending_soonest"
            ? asc(workOrderTable.end_date)
            : asc(workOrderTable.created_at),
        workOrderOrder === "latest"
          ? desc(workOrderTable.id)
          : asc(workOrderTable.id),
      ];

      try {
        const [totalResult] = await ctx.db
          .select({ count: count() })
          .from(workOrderTable)
          .leftJoin(clientTable, eq(workOrderTable.client_id, clientTable.id))
          .leftJoin(officeTable, eq(workOrderTable.office_id, officeTable.id))
          .where(conditions);

        const total = totalResult?.count ?? 0;

        if (total === 0) {
          return {
            workOrders: [],
            pagination: {
              page,
              limit,
              total,
              hasMore: false,
              totalPages: 0,
            },
          };
        }

        const offset = (page - 1) * limit;

        const workOrders = await ctx.db
          .select({
            id: workOrderTable.id,
            code: workOrderTable.code,
            purchase_order_code: workOrderTable.purchase_order_code,
            client_id: workOrderTable.client_id,
            client_name: clientTable.name,
            office_id: workOrderTable.office_id,
            office_name: officeTable.name,
            start_date: workOrderTable.start_date,
            end_date: workOrderTable.end_date,
            handing_over_date: workOrderTable.handing_over_date,
            agreement_number: workOrderTable.agreement_number,
            status: workOrderTable.status,
            created_at: workOrderTable.created_at,
            updated_at: workOrderTable.updated_at,
          })
          .from(workOrderTable)
          .leftJoin(clientTable, eq(workOrderTable.client_id, clientTable.id))
          .leftJoin(officeTable, eq(workOrderTable.office_id, officeTable.id))
          .where(conditions)
          .limit(limit)
          .offset(offset)
          .orderBy(...orderBy);

        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + workOrders.length < total;

        // Filtered by pending or completed, each row has that status;
        // otherwise the page's statuses are worked out.
        const effectiveMap = useEffectiveStatusFilter
          ? null
          : await batchEffectiveWorkOrderStatuses(
              ctx.db,
              scope,
              workOrders.map((wo) => ({
                id: Number(wo.id),
                office_id: wo.office_id ?? null,
                status: String(wo.status ?? ""),
              })),
            );

        const workOrdersWithEffectiveStatus = workOrders.map((wo) => ({
          ...wo,
          status: useEffectiveStatusFilter
            ? statusFilter
            : (effectiveMap?.get(Number(wo.id)) ??
              effectiveWorkOrderStatusFromDbOnly(String(wo.status))),
        }));

        return {
          workOrders: workOrdersWithEffectiveStatus,
          pagination: {
            page,
            limit,
            total,
            hasMore,
            totalPages,
          },
        };
      } catch (error) {
        throw fromDatabaseError(error, "Fetching work orders");
      }
    }),
  ),

  getWorkOrders: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        const scopeWhere = workOrderScopeWhere(scope);
        return await ctx.db
          .select({
            id: workOrderTable.id,
            code: workOrderTable.code,
            purchase_order_code: workOrderTable.purchase_order_code,
            client_id: workOrderTable.client_id,
            client_name: clientTable.name,
            office_id: workOrderTable.office_id,
            office_name: officeTable.name,
            start_date: workOrderTable.start_date,
            end_date: workOrderTable.end_date,
            handing_over_date: workOrderTable.handing_over_date,
            agreement_number: workOrderTable.agreement_number,
            description: workOrderTable.description,
            status: workOrderTable.status,
            cancellation_reason: workOrderTable.cancellation_reason,
            created_at: workOrderTable.created_at,
            updated_at: workOrderTable.updated_at,
          })
          .from(workOrderTable)
          .leftJoin(clientTable, eq(workOrderTable.client_id, clientTable.id))
          .leftJoin(officeTable, eq(workOrderTable.office_id, officeTable.id))
          .where(scopeWhere);
      } catch (error) {
        throw fromDatabaseError(error, "Fetching all work orders");
      }
    }),
  ),

  getWorkOrder: protectedProcedure.input(getWorkOrderSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { id } = input;
      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrder(ctx.db, scope, id);

        const workOrders = await ctx.db
          .select({
            id: workOrderTable.id,
            code: workOrderTable.code,
            purchase_order_code: workOrderTable.purchase_order_code,
            client_id: workOrderTable.client_id,
            client_name: clientTable.name,
            client_email: clientTable.email,
            client_contact: clientTable.contact_number,
            office_id: workOrderTable.office_id,
            office_name: officeTable.name,
            start_date: workOrderTable.start_date,
            end_date: workOrderTable.end_date,
            handing_over_date: workOrderTable.handing_over_date,
            agreement_number: workOrderTable.agreement_number,
            rate_contract_number: workOrderTable.rate_contract_number,
            document_key: workOrderTable.document_key,
            documents: workOrderTable.documents,
            process_type: workOrderTable.process_type,
            proposal_id: workOrderTable.proposal_id,
            description: workOrderTable.description,
            area: workOrderTable.area,
            remarks: workOrderTable.remarks,
            status: workOrderTable.status,
            cancellation_reason: workOrderTable.cancellation_reason,
            created_at: workOrderTable.created_at,
            updated_at: workOrderTable.updated_at,
          })
          .from(workOrderTable)
          .leftJoin(clientTable, eq(workOrderTable.client_id, clientTable.id))
          .leftJoin(officeTable, eq(workOrderTable.office_id, officeTable.id))
          .where(eq(workOrderTable.id, id));

        if (workOrders.length === 0) {
          throw notFound("Work order", id);
        }
        return workOrders[0];
      } catch (error) {
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Fetching work order details");
      }
    }),
  ),

  getWorkOrderSites: protectedProcedure.input(getWorkOrderSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { id, limit, page, search, sort_by, sort_order } = input;

      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrder(ctx.db, scope, id);

        const [woRow] = await ctx.db
          .select({ office_id: workOrderTable.office_id })
          .from(workOrderTable)
          .where(eq(workOrderTable.id, id))
          .limit(1);

        const restrictSitesToAssignment =
          scope.kind === "restricted" &&
          woRow &&
          !scope.officeIds.includes(woRow.office_id);

        const siteRowFilter = restrictSitesToAssignment
          ? scope.workOrderSiteIds.length > 0
            ? inArray(workOrderSiteTable.id, scope.workOrderSiteIds)
            : eq(workOrderSiteTable.id, -1)
          : undefined;

        const allSitesWhere = and(
          eq(workOrderSiteTable.work_order_id, id),
          hasPhysicalSite,
          siteRowFilter,
        );
        // A search matches the site's code, name, address, city or state.
        const term = search?.trim();
        const woSiteWhere = and(
          allSitesWhere,
          term
            ? or(
                codeMatches(siteTable.code, CODE_PREFIX.SITE, term),
                like(siteTable.name, `%${escapeLike(term)}%`),
                like(siteTable.address, `%${escapeLike(term)}%`),
                like(siteTable.city, `%${escapeLike(term)}%`),
                like(siteTable.state, `%${escapeLike(term)}%`),
              )
            : undefined,
        );

        const countSites = (where: typeof woSiteWhere) =>
          ctx.db
            .select({ count: count() })
            .from(workOrderSiteTable)
            .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .where(where);
        const [[totalResult], [allResult]] = await Promise.all([
          countSites(woSiteWhere),
          term ? countSites(allSitesWhere) : Promise.resolve([undefined]),
        ]);

        const total = totalResult?.count ?? 0;
        // Every site of the work order, whatever the search.
        const totalSites = term ? (allResult?.count ?? 0) : total;

        if (total === 0) {
          return {
            sites: [],
            total_sites: totalSites,
            pagination: {
              page,
              limit,
              total,
              hasMore: false,
              totalPages: 0,
            },
          };
        }

        const offset = (page - 1) * limit;

        const woSites = await ctx.db
          .select({
            id: workOrderSiteTable.id,
            site_id: workOrderSiteTable.site_id,
            site_name: siteTable.name,
            site_address: siteTable.address,
            site_city: siteTable.city,
            site_state: siteTable.state,
            site_pincode: siteTable.pincode,
            start_date: workOrderSiteTable.date,
            end_date: workOrderSiteTable.end_date,
            status: workOrderSiteTable.status,
            // A bioremediation site is complete once its TPH is below target.
            is_completed: workOrderSiteTable.is_completed,
            created_at: workOrderSiteTable.created_at,
          })
          .from(workOrderSiteTable)
          .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
          .where(woSiteWhere)
          .limit(limit)
          .offset(offset)
          // The id breaks ties so sites never repeat or go missing across
          // pages.
          .orderBy(
            desc(workOrderSiteTable.created_at),
            desc(workOrderSiteTable.id),
          );

        // The page's operators and measurement sheets, two queries in all
        // rather than two per site.
        const pageSiteIds = woSites.map((woSite) => woSite.id);
        const [pageUsers, pageSheets] =
          pageSiteIds.length === 0
            ? [[], []]
            : await Promise.all([
                ctx.db
                  .select({
                    work_order_site_id:
                      workOrderSiteUserTable.work_order_site_id,
                    user_id: workOrderSiteUserTable.user_id,
                    user_name: userTable.name,
                    user_email: userTable.email,
                    user_contact_number: userTable.contact_number,
                    user_role: userTable.role,
                  })
                  .from(workOrderSiteUserTable)
                  .leftJoin(
                    userTable,
                    eq(workOrderSiteUserTable.user_id, userTable.id),
                  )
                  .where(
                    inArray(
                      workOrderSiteUserTable.work_order_site_id,
                      pageSiteIds,
                    ),
                  ),
                ctx.db
                  .select()
                  .from(workOrderSiteDocsTable)
                  .where(
                    and(
                      inArray(
                        workOrderSiteDocsTable.work_order_site_id,
                        pageSiteIds,
                      ),
                      eq(workOrderSiteDocsTable.type, "measurement_sheet"),
                    ),
                  ),
              ]);

        const sitesWithDetails = woSites.map((woSite) => ({
          ...woSite,
          users: pageUsers
            .filter((user) => user.work_order_site_id === woSite.id)
            .map(({ work_order_site_id: _site, ...user }) => user),
          measurement_sheets: pageSheets.filter(
            (sheet) => sheet.work_order_site_id === woSite.id,
          ),
        }));

        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + sitesWithDetails.length < total;

        return {
          sites: sitesWithDetails,
          total_sites: totalSites,
          pagination: {
            page,
            limit,
            total,
            hasMore,
            totalPages,
          },
        };
      } catch (error) {
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Fetching work order sites");
      }
    }),
  ),

  getWorkOrdersByOffice: protectedProcedure
    .input(getWorkOrdersByOfficeSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { office_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessOffice(ctx.db, scope, office_id);

          const scopeWhere = workOrderScopeWhere(scope);
          return await ctx.db
            .select({
              id: workOrderTable.id,
              code: workOrderTable.code,
              purchase_order_code: workOrderTable.purchase_order_code,
              client_id: workOrderTable.client_id,
              client_name: clientTable.name,
              office_id: workOrderTable.office_id,
              start_date: workOrderTable.start_date,
              end_date: workOrderTable.end_date,
              handing_over_date: workOrderTable.handing_over_date,
              agreement_number: workOrderTable.agreement_number,
              status: workOrderTable.status,
              created_at: workOrderTable.created_at,
              updated_at: workOrderTable.updated_at,
            })
            .from(workOrderTable)
            .leftJoin(clientTable, eq(workOrderTable.client_id, clientTable.id))
            .where(
              andScope(eq(workOrderTable.office_id, office_id), scopeWhere),
            )
            .orderBy(desc(workOrderTable.created_at));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching work orders for office");
        }
      }),
    ),

  getWorkOrdersByClient: protectedProcedure
    .input(getWorkOrdersByClientSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { client_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessClient(ctx.db, scope, client_id);

          const scopeWhere = workOrderScopeWhere(scope);
          return await ctx.db
            .select({
              id: workOrderTable.id,
              code: workOrderTable.code,
              purchase_order_code: workOrderTable.purchase_order_code,
              client_id: workOrderTable.client_id,
              office_id: workOrderTable.office_id,
              office_name: officeTable.name,
              start_date: workOrderTable.start_date,
              end_date: workOrderTable.end_date,
              handing_over_date: workOrderTable.handing_over_date,
              agreement_number: workOrderTable.agreement_number,
              status: workOrderTable.status,
              created_at: workOrderTable.created_at,
              updated_at: workOrderTable.updated_at,
            })
            .from(workOrderTable)
            .leftJoin(officeTable, eq(workOrderTable.office_id, officeTable.id))
            .where(
              andScope(eq(workOrderTable.client_id, client_id), scopeWhere),
            );
        } catch (error) {
          throw fromDatabaseError(error, "Fetching work orders for client");
        }
      }),
    ),

  getWorkOrderDetails: protectedProcedure.input(getWorkOrderSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { id } = input;

      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrder(ctx.db, scope, id);

        const woRowForScope = (
          await ctx.db
            .select({ office_id: workOrderTable.office_id })
            .from(workOrderTable)
            .where(eq(workOrderTable.id, id))
            .limit(1)
        )[0];

        const woSitesWhere = (() => {
          if (
            scope.kind === "restricted" &&
            woRowForScope &&
            !scope.officeIds.includes(woRowForScope.office_id)
          ) {
            return scope.workOrderSiteIds.length > 0
              ? and(
                  eq(workOrderSiteTable.work_order_id, id),
                  inArray(workOrderSiteTable.id, scope.workOrderSiteIds),
                )
              : and(
                  eq(workOrderSiteTable.work_order_id, id),
                  eq(workOrderSiteTable.id, -1),
                );
          }
          return eq(workOrderSiteTable.work_order_id, id);
        })();

        const workOrders = await ctx.db
          .select({
            id: workOrderTable.id,
            code: workOrderTable.code,
            purchase_order_code: workOrderTable.purchase_order_code,
            description: workOrderTable.description,
            client_id: workOrderTable.client_id,
            client_name: clientTable.name,
            parent_client_name: parentClientTable.name,
            office_id: workOrderTable.office_id,
            office_name: officeTable.name,
            start_date: workOrderTable.start_date,
            end_date: workOrderTable.end_date,
            handing_over_date: workOrderTable.handing_over_date,
            agreement_number: workOrderTable.agreement_number,
            rate_contract_number: workOrderTable.rate_contract_number,
            document_key: workOrderTable.document_key,
            documents: workOrderTable.documents,
            process_type: workOrderTable.process_type,
            proposal_id: workOrderTable.proposal_id,
            area: workOrderTable.area,
            remarks: workOrderTable.remarks,
            status: workOrderTable.status,
            cancellation_reason: workOrderTable.cancellation_reason,
            approved_at: workOrderTable.approved_at,
            approved_by: workOrderTable.approved_by,
            created_at: workOrderTable.created_at,
            updated_at: workOrderTable.updated_at,
          })
          .from(workOrderTable)
          .leftJoin(clientTable, eq(workOrderTable.client_id, clientTable.id))
          .leftJoin(
            parentClientTable,
            eq(clientTable.parent_client_id, parentClientTable.id),
          )
          .leftJoin(officeTable, eq(workOrderTable.office_id, officeTable.id))
          .where(eq(workOrderTable.id, id))
          .orderBy(desc(workOrderTable.created_at));

        if (workOrders.length === 0) {
          throw notFound("Work order", id, {
            userMessage:
              "The work order you're looking for doesn't exist or has been deleted.",
          });
        }

        const workOrder = workOrders[0]!;

        const canManage = ctx.user!.role === USER_ROLES.ADMIN;

        let approvedByName: string | null = null;
        if (workOrder.approved_by) {
          const [approver] = await ctx.db
            .select({ name: userTable.name })
            .from(userTable)
            .where(eq(userTable.id, workOrder.approved_by))
            .limit(1);
          approvedByName = approver?.name ?? null;
        }

        const woSites = await ctx.db
          .select({
            wo_site_id: workOrderSiteTable.id,
            site_id: siteTable.id,
            site_name: siteNameOrRestoration,
            process_type: workOrderSiteTable.process_type,
            site_address: siteTable.address,
            site_city: siteTable.city,
            site_state: siteTable.state,
            site_pincode: siteTable.pincode,
            start_date: workOrderSiteTable.date,
            end_date: workOrderSiteTable.end_date,
            status: workOrderSiteTable.status,
            is_completed: workOrderSiteTable.is_completed,
            created_at: workOrderSiteTable.created_at,
          })
          .from(workOrderSiteTable)
          .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
          .where(woSitesWhere)
          .orderBy(desc(workOrderSiteTable.created_at));

        const woSiteIds = woSites.map((s: any) => s.wo_site_id);

        // Only bioremediation records soil quantities; restoration tracks its
        // expenses alone. A site's estimate is its share of the schedule of
        // rates; older sites may also have a completion entry.
        let allCompletions: any[] = [];
        const estimateBySite = new Map<
          number,
          { quantity: number; amount: number }
        >();
        if (woSiteIds.length > 0) {
          const bioremSoil = await ctx.db
            .select()
            .from(bioremediationContSoilTable)
            .where(
              inArray(bioremediationContSoilTable.work_order_site_id, woSiteIds),
            );

          allCompletions = bioremSoil
            .filter((item) => item.type === "completion")
            .map((item: any) => ({
              ...item,
              activity_name: "biorem_cont_soil",
            }));
          for (const item of bioremSoil) {
            if (item.type !== "estimate_sub-wo") continue;
            estimateBySite.set(item.work_order_site_id, {
              quantity: Number(item.estimated_quantity) || 0,
              amount: Number(item.amount) || 0,
            });
          }
        }

        // Each site's expense totals, added up by the database rather than
        // read row by row.
        type SiteExpenseAgg = {
          total: number;
          exceededTotal: number;
          count: number;
        };
        const siteExpenseMap = new Map<number, SiteExpenseAgg>();
        let woExpenseTotal = 0;
        let woExceededTotal = 0;
        let woExpenseCount = 0;

        if (woSiteIds.length > 0) {
          const expenseTotals = await ctx.db
            .select({
              work_order_site_id: workOrderSiteExpenseTable.work_order_site_id,
              total: sum(workOrderSiteExpenseTable.amount),
              exceeded: sql<string>`sum(case when ${workOrderSiteExpenseTable.is_exceeded} <> 0 then ${workOrderSiteExpenseTable.amount} else 0 end)`,
              count: count(),
            })
            .from(workOrderSiteExpenseTable)
            .innerJoin(
              workOrderSiteTable,
              eq(
                workOrderSiteExpenseTable.work_order_site_id,
                workOrderSiteTable.id,
              ),
            )
            .where(woSitesWhere)
            .groupBy(workOrderSiteExpenseTable.work_order_site_id);

          for (const row of expenseTotals) {
            const siteAgg = {
              total: Number(row.total || 0),
              exceededTotal: Number(row.exceeded || 0),
              count: Number(row.count || 0),
            };
            siteExpenseMap.set(row.work_order_site_id, siteAgg);
            woExpenseTotal += siteAgg.total;
            woExceededTotal += siteAgg.exceededTotal;
            woExpenseCount += siteAgg.count;
          }
        }

        const sitesWithDetails = woSites.map((woSite: any) => {
          const siteCompletions = allCompletions.filter(
            (e: any) => e.work_order_site_id === woSite.wo_site_id,
          );
          const totalCompletionAmount = siteCompletions.reduce(
            (acc: number, curr: any) => acc + Number(curr.amount || 0),
            0,
          );

          const expAgg =
            siteExpenseMap.get(woSite.wo_site_id) ?? {
              total: 0,
              exceededTotal: 0,
              count: 0,
            };

          return {
            site: {
              id: woSite.site_id,
              name: woSite.site_name,
              address: woSite.site_address,
              city: woSite.site_city,
              state: woSite.site_state,
              pincode: woSite.site_pincode,
            },
            wo_site_id: woSite.wo_site_id,
            process_type: woSite.process_type,
            start_date: woSite.start_date,
            end_date: woSite.end_date,
            status: woSite.status,
            is_completed: woSite.is_completed,
            activity_type: woSite.activity_type,
            metric_ton: woSite.metric_ton,
            metric_ton_rate: woSite.metric_ton_rate,
            budget_amount: woSite.budget_amount,
            total_completion_amount: totalCompletionAmount.toString(),
            total_expenses: expAgg.total.toString(),
            total_exceeded_expenses: expAgg.exceededTotal.toString(),
            expense_entry_count: expAgg.count,
            estimate: estimateBySite.get(woSite.wo_site_id) ?? null,
            created_at: woSite.created_at,
            completions: siteCompletions,
          };
        });

        const totalIncomeFromSites = sitesWithDetails.reduce(
          (acc, s) => acc + Number(s.total_completion_amount || 0),
          0,
        );

        const scheduleOfRates = await ctx.db
          .select()
          .from(scheduleOfRatesTable)
          .where(eq(scheduleOfRatesTable.work_order_id, id));

        return {
          workOrder: {
            ...workOrder,
            approved_by_name: approvedByName,
            is_approved: workOrder.approved_at != null,
          },
          canManage,
          sites: sitesWithDetails,
          scheduleOfRates: scheduleOfRates.map((row) => ({
            ...row,
            transportation_slabs: readTransportationSlabs(
              row.transportation_slabs,
            ),
          })),
          stats: {
            total_sites: sitesWithDetails.filter((s) => s.site.id != null)
              .length,
          },
          work_order_expense_summary: {
            total_expenses: woExpenseTotal,
            exceeded_total: woExceededTotal,
            regular_total: woExpenseTotal - woExceededTotal,
            expense_entry_count: woExpenseCount,
            total_income: totalIncomeFromSites,
            net_surplus: totalIncomeFromSites - woExpenseTotal,
          },
        };
      } catch (error) {
        if (error && typeof error === "object" && "errorCode" in error) {
          throw error;
        }
        throw fromDatabaseError(error, "Fetching work order full details");
      }
    }),
  ),
});

import { and, asc, count, desc, eq, like, or, inArray } from "drizzle-orm";
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
import { USER_ROLES } from "../../authorization";
import { batchEffectiveWorkOrderStatuses } from "./batch-effective-work-order-status";
import { effectiveWorkOrderStatusFromDbOnly } from "@pkg/utils";

const {
  workOrderTable,
  workOrderSiteTable,
  workOrderSiteDocsTable,
  clientTable,
  officeTable,
  siteTable,
  workOrderSiteUserTable,
  userTable,
  scheduleOfRatesTable,
  cleaningUpSoilAreaTable,
  liftingRecoveryOilSlushTable,
  excavationContSoilTable,
  transportationContSoilTable,
  refillingExcavatedContSoilTable,
  bioremediationContSoilTable,
  workOrderSiteExpenseTable,
} = schema;

export const workOrderQueryRouter = router({
  getAll: protectedProcedure.input(getAllWorkOrdersPaginatedSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { page, limit, searchQuery, status, office_id, workOrderOrder } =
        input;

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

      if (statusFilter === "pending") {
        conditions = and(conditions, eq(workOrderTable.status, "pending"));
      } else if (statusFilter === "completed") {
        conditions = and(
          conditions,
          inArray(workOrderTable.status, ["pending", "completed"]),
        );
      } else if (statusFilter) {
        conditions = and(conditions, eq(workOrderTable.status, statusFilter));
      }

      if (office_id) {
        conditions = and(conditions, eq(workOrderTable.office_id, office_id));
      }

      if (searchQuery && searchQuery.trim() !== "") {
        conditions = and(
          conditions,
          or(
            like(workOrderTable.code, `%${escapeLike(searchQuery)}%`),
            like(workOrderTable.title, `%${escapeLike(searchQuery)}%`),
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

      const orderBy =
        workOrderOrder === "asc"
          ? asc(workOrderTable.title)
          : workOrderOrder === "desc"
            ? desc(workOrderTable.title)
            : workOrderOrder === "latest"
              ? desc(workOrderTable.created_at)
              : asc(workOrderTable.created_at);

      try {
        if (useEffectiveStatusFilter) {
          const candidates = await ctx.db
            .select({
              id: workOrderTable.id,
              code: workOrderTable.code,
              title: workOrderTable.title,
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
            .orderBy(orderBy);

          const effectiveMap = await batchEffectiveWorkOrderStatuses(
            ctx.db,
            scope,
            candidates.map((wo) => ({
              id: Number(wo.id),
              office_id: wo.office_id ?? null,
              status: String(wo.status ?? ""),
            })),
          );

          const filtered = candidates.filter((wo) => {
            const effective =
              effectiveMap.get(Number(wo.id)) ??
              effectiveWorkOrderStatusFromDbOnly(String(wo.status));
            return effective === statusFilter;
          });

          const total = filtered.length;
          const offset = (page - 1) * limit;
          const pageSlice = filtered.slice(offset, offset + limit);
          const workOrdersWithEffectiveStatus = pageSlice.map((wo) => ({
            ...wo,
            status:
              effectiveMap.get(Number(wo.id)) ??
              effectiveWorkOrderStatusFromDbOnly(String(wo.status)),
          }));

          const totalPages = Math.ceil(total / limit) || 0;
          const hasMore = offset + pageSlice.length < total;

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
        }

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
            title: workOrderTable.title,
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
          .orderBy(orderBy);

        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + workOrders.length < total;

        const effectiveMap = await batchEffectiveWorkOrderStatuses(
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
          status:
            effectiveMap.get(Number(wo.id)) ??
            effectiveWorkOrderStatusFromDbOnly(String(wo.status)),
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
            title: workOrderTable.title,
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
            title: workOrderTable.title,
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
            process_type: workOrderTable.process_type,
            proposal_id: workOrderTable.proposal_id,
            description: workOrderTable.description,
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

        const woSiteWhere = siteRowFilter
          ? and(eq(workOrderSiteTable.work_order_id, id), siteRowFilter)
          : eq(workOrderSiteTable.work_order_id, id);

        const [totalResult] = await ctx.db
          .select({ count: count() })
          .from(workOrderSiteTable)
          .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
          .where(woSiteWhere);

        const total = totalResult?.count ?? 0;

        if (total === 0) {
          return {
            sites: [],
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
            end_date: workOrderSiteTable.end_date,
            status: workOrderSiteTable.status,
            created_at: workOrderSiteTable.created_at,
          })
          .from(workOrderSiteTable)
          .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
          .where(woSiteWhere)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(workOrderSiteTable.created_at));

        const [sitesUsers, sitesSheets] = await Promise.all([
          Promise.all(
            woSites.map((woSite: any) =>
              ctx.db
                .select({
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
                  eq(workOrderSiteUserTable.work_order_site_id, woSite.id),
                ),
            ),
          ),
          Promise.all(
            woSites.map((woSite: any) =>
              ctx.db
                .select()
                .from(workOrderSiteDocsTable)
                .where(
                  and(
                    eq(workOrderSiteDocsTable.work_order_site_id, woSite.id),
                    eq(workOrderSiteDocsTable.type, "measurement_sheet"),
                  ),
                ),
            ),
          ),
        ]);

        const sitesWithDetails = woSites.map((woSite: any, index: any) => ({
          ...woSite,
          users: sitesUsers[index],
          measurement_sheets: sitesSheets[index],
        }));

        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + sitesWithDetails.length < total;

        return {
          sites: sitesWithDetails,
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
              title: workOrderTable.title,
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
              title: workOrderTable.title,
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
            title: workOrderTable.title,
            description: workOrderTable.description,
            client_id: workOrderTable.client_id,
            client_name: clientTable.name,
            office_id: workOrderTable.office_id,
            office_name: officeTable.name,
            start_date: workOrderTable.start_date,
            end_date: workOrderTable.end_date,
            handing_over_date: workOrderTable.handing_over_date,
            agreement_number: workOrderTable.agreement_number,
            rate_contract_number: workOrderTable.rate_contract_number,
            document_key: workOrderTable.document_key,
            process_type: workOrderTable.process_type,
            proposal_id: workOrderTable.proposal_id,
            status: workOrderTable.status,
            cancellation_reason: workOrderTable.cancellation_reason,
            approved_at: workOrderTable.approved_at,
            approved_by: workOrderTable.approved_by,
            created_at: workOrderTable.created_at,
            updated_at: workOrderTable.updated_at,
          })
          .from(workOrderTable)
          .leftJoin(clientTable, eq(workOrderTable.client_id, clientTable.id))
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
            site_name: siteTable.name,
            site_address: siteTable.address,
            site_city: siteTable.city,
            site_state: siteTable.state,
            site_pincode: siteTable.pincode,
            end_date: workOrderSiteTable.end_date,
            status: workOrderSiteTable.status,
            is_completed: workOrderSiteTable.is_completed,
            created_at: workOrderSiteTable.created_at,
          })
          .from(workOrderSiteTable)
          .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
          .where(woSitesWhere)
          .orderBy(desc(workOrderSiteTable.created_at));

        const [sitesUsers, sitesSheets] = await Promise.all([
          Promise.all(
            woSites.map((woSite: any) =>
              ctx.db
                .select({
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
                  eq(
                    workOrderSiteUserTable.work_order_site_id,
                    woSite.wo_site_id,
                  ),
                ),
            ),
          ),
          Promise.all(
            woSites.map((woSite: any) =>
              ctx.db
                .select()
                .from(workOrderSiteDocsTable)
                .where(
                  and(
                    eq(
                      workOrderSiteDocsTable.work_order_site_id,
                      woSite.wo_site_id,
                    ),
                    eq(workOrderSiteDocsTable.type, "measurement_sheet"),
                  ),
                ),
            ),
          ),
        ]);

        const woSiteIds = woSites.map((s: any) => s.wo_site_id);

        let allCompletions: any[] = [];
        if (woSiteIds.length > 0) {
          const [
            cleanSoilAreaExp,
            liftingOilExp,
            excavSoilExp,
            transSoilExp,
            refillSoilExp,
            bioremSoilExp,
          ] = await Promise.all([
            ctx.db
              .select()
              .from(cleaningUpSoilAreaTable)
              .where(
                and(
                  inArray(
                    cleaningUpSoilAreaTable.work_order_site_id,
                    woSiteIds,
                  ),
                  eq(cleaningUpSoilAreaTable.type, "completion" as any),
                ),
              ),
            ctx.db
              .select()
              .from(liftingRecoveryOilSlushTable)
              .where(
                and(
                  inArray(
                    liftingRecoveryOilSlushTable.work_order_site_id,
                    woSiteIds,
                  ),
                  eq(liftingRecoveryOilSlushTable.type, "completion" as any),
                ),
              ),
            ctx.db
              .select()
              .from(excavationContSoilTable)
              .where(
                and(
                  inArray(
                    excavationContSoilTable.work_order_site_id,
                    woSiteIds,
                  ),
                  eq(excavationContSoilTable.type, "completion" as any),
                ),
              ),
            ctx.db
              .select()
              .from(transportationContSoilTable)
              .where(
                and(
                  inArray(
                    transportationContSoilTable.work_order_site_id,
                    woSiteIds,
                  ),
                  eq(transportationContSoilTable.type, "completion" as any),
                ),
              ),
            ctx.db
              .select()
              .from(refillingExcavatedContSoilTable)
              .where(
                and(
                  inArray(
                    refillingExcavatedContSoilTable.work_order_site_id,
                    woSiteIds,
                  ),
                  eq(refillingExcavatedContSoilTable.type, "completion" as any),
                ),
              ),
            ctx.db
              .select()
              .from(bioremediationContSoilTable)
              .where(
                and(
                  inArray(
                    bioremediationContSoilTable.work_order_site_id,
                    woSiteIds,
                  ),
                  eq(bioremediationContSoilTable.type, "completion" as any),
                ),
              ),
          ]);

          const mapCompletion = (items: any[], activityName: string) =>
            items.map((item) => ({
              ...item,
              activity_name: activityName,
            }));

          allCompletions = [
            ...mapCompletion(cleanSoilAreaExp, "clean_soil_area"),
            ...mapCompletion(liftingOilExp, "lifting_oil_slush"),
            ...mapCompletion(excavSoilExp, "excav_cont_soil"),
            ...mapCompletion(transSoilExp, "trans_cont_soil"),
            ...mapCompletion(refillSoilExp, "refill_excav_soil"),
            ...mapCompletion(bioremSoilExp, "biorem_cont_soil"),
          ];
        }

        type SiteExpenseAgg = {
          total: number;
          exceededTotal: number;
          byType: Record<string, number>;
          count: number;
        };
        const siteExpenseMap = new Map<number, SiteExpenseAgg>();
        const woExpenseByType: Record<string, number> = {};
        let woExpenseTotal = 0;
        let woExceededTotal = 0;
        let expenseRows: {
          work_order_site_id: number;
          expense_type: string;
          amount: string | null;
          is_exceeded: number | null;
        }[] = [];

        if (woSiteIds.length > 0) {
          expenseRows = await ctx.db
            .select({
              work_order_site_id:
                workOrderSiteExpenseTable.work_order_site_id,
              expense_type: workOrderSiteExpenseTable.expense_type,
              amount: workOrderSiteExpenseTable.amount,
              is_exceeded: workOrderSiteExpenseTable.is_exceeded,
            })
            .from(workOrderSiteExpenseTable)
            .where(
              inArray(
                workOrderSiteExpenseTable.work_order_site_id,
                woSiteIds,
              ),
            );

          for (const row of expenseRows) {
            const amt = Number(row.amount || 0);
            const isExceeded = !!row.is_exceeded;
            woExpenseTotal += amt;
            if (isExceeded) woExceededTotal += amt;
            woExpenseByType[row.expense_type] =
              (woExpenseByType[row.expense_type] || 0) + amt;

            let siteAgg = siteExpenseMap.get(row.work_order_site_id);
            if (!siteAgg) {
              siteAgg = {
                total: 0,
                exceededTotal: 0,
                byType: {},
                count: 0,
              };
              siteExpenseMap.set(row.work_order_site_id, siteAgg);
            }
            siteAgg.total += amt;
            if (isExceeded) siteAgg.exceededTotal += amt;
            siteAgg.count += 1;
            siteAgg.byType[row.expense_type] =
              (siteAgg.byType[row.expense_type] || 0) + amt;
          }
        }

        const sitesWithDetails = woSites.map((woSite: any, index: number) => {
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
              byType: {} as Record<string, number>,
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
            expense_by_type: expAgg.byType,
            expense_entry_count: expAgg.count,
            created_at: woSite.created_at,
            users: sitesUsers[index],
            measurement_sheets: sitesSheets[index],
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
          scheduleOfRates,
          stats: {
            total_sites: sitesWithDetails.length,
          },
          work_order_expense_summary: {
            total_expenses: woExpenseTotal,
            exceeded_total: woExceededTotal,
            regular_total: woExpenseTotal - woExceededTotal,
            by_type: woExpenseByType,
            expense_entry_count: expenseRows.length,
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

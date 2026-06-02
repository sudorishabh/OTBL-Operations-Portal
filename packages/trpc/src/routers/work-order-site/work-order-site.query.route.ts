import { eq, desc, asc, and, or, like, inArray, count } from "drizzle-orm";
import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";
import { router } from "../../trpc";
import { protectedProcedure } from "../../core";
import {
  assertCanAccessOffice,
  assertCanAccessWorkOrder,
  assertCanAccessWorkOrderSite,
  getAccessScope,
} from "../../access-scope";
import { assertOfficeManager } from "../../helper/office-permissions";
import { handleQuery } from "../../helper/typed-handler";
import { escapeLike } from "../../helper/escape-like";
import { z } from "zod";
import { fromDatabaseError, notFound } from "../../errors";

const getWorkOrderSiteDetailsSchema = z.object({
  work_order_site_id: z.number().positive(),
});

const getSiteActivitiesSchema = z.object({
  work_order_site_id: z.number().positive(),
});

const getSiteDocumentsSchema = z.object({
  work_order_site_id: z.number().positive(),
});

const {
  workOrderSiteTable,
  workOrderSiteUserTable,
  siteTable,
  workOrderTable,
  userTable,
  siteActivityTable,
  workOrderSiteDocsTable,
  workOrderSiteOperatorUploadTable,
  scheduleOfRatesTable,
  bioremediationContSoilTable,
  bioSampleTable,
  bioOilZappingTable,
  cleaningUpSoilAreaTable,
  liftingRecoveryOilSlushTable,
  excavationContSoilTable,
  transportationContSoilTable,
  refillingExcavatedContSoilTable,
} = schema;

export const workOrderSiteQueryRouter = router({
  getOperatorUploadsByWorkOrder: protectedProcedure
    .input(z.object({ work_order_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessWorkOrder(ctx.db, scope, work_order_id);

          const uploads = await ctx.db
            .select({
              id: workOrderSiteOperatorUploadTable.id,
              work_order_site_id:
                workOrderSiteOperatorUploadTable.work_order_site_id,
              site_name: siteTable.name,
              description: workOrderSiteOperatorUploadTable.description,
              file_name: workOrderSiteOperatorUploadTable.file_name,
              document_url: workOrderSiteOperatorUploadTable.document_url,
              document_id: workOrderSiteOperatorUploadTable.document_id,
              created_at: workOrderSiteOperatorUploadTable.created_at,
              uploaded_by_name: userTable.name,
            })
            .from(workOrderSiteOperatorUploadTable)
            .innerJoin(
              workOrderSiteTable,
              eq(
                workOrderSiteOperatorUploadTable.work_order_site_id,
                workOrderSiteTable.id,
              ),
            )
            .innerJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .innerJoin(
              userTable,
              eq(
                workOrderSiteOperatorUploadTable.uploaded_by_user_id,
                userTable.id,
              ),
            )
            .where(eq(workOrderSiteTable.work_order_id, work_order_id))
            .orderBy(desc(workOrderSiteOperatorUploadTable.created_at));

          return uploads;
        } catch (error) {
          throw fromDatabaseError(
            error,
            "Fetching operator uploads for work order",
          );
        }
      }),
    ),

  getMyAssignedWorkOrderSites: protectedProcedure.query(
    handleQuery(async ({ ctx }) => {
      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );

        const assignedIds =
          scope.kind === "restricted" && scope.ui === "wo_site_upload"
            ? scope.workOrderSiteIds
            : [];
        if (assignedIds.length === 0) return [];

        const rows = await ctx.db
          .select({
            work_order_site_id: workOrderSiteTable.id,
            work_order_id: workOrderTable.id,
            wo_code: workOrderTable.code,
            wo_title: workOrderTable.title,
            site_name: siteTable.name,
            site_address: siteTable.address,
            site_city: siteTable.city,
            site_state: siteTable.state,
            job_number: workOrderSiteTable.job_number,
            area: workOrderSiteTable.area,
            process_type: workOrderSiteTable.process_type,
            start_date: workOrderSiteTable.date,
            end_date: workOrderSiteTable.end_date,
            status: workOrderSiteTable.status,
            is_completed: workOrderSiteTable.is_completed,
          })
          .from(workOrderSiteTable)
          .innerJoin(
            workOrderTable,
            eq(workOrderSiteTable.work_order_id, workOrderTable.id),
          )
          .innerJoin(
            siteTable,
            eq(workOrderSiteTable.site_id, siteTable.id),
          )
          .where(inArray(workOrderSiteTable.id, assignedIds))
          .orderBy(desc(workOrderSiteTable.date));

        if (rows.length === 0) return [];

        const ids = rows.map((r) => r.work_order_site_id);
        const uploadCounts = await ctx.db
          .select({
            work_order_site_id:
              workOrderSiteOperatorUploadTable.work_order_site_id,
            uploads_count: count(),
          })
          .from(workOrderSiteOperatorUploadTable)
          .where(
            inArray(
              workOrderSiteOperatorUploadTable.work_order_site_id,
              ids,
            ),
          )
          .groupBy(workOrderSiteOperatorUploadTable.work_order_site_id);

        const countByWoSiteId = new Map<number, number>(
          uploadCounts.map((c) => [
            c.work_order_site_id,
            Number(c.uploads_count),
          ]),
        );

        return rows.map((r) => ({
          ...r,
          uploads_count: countByWoSiteId.get(r.work_order_site_id) ?? 0,
        }));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching assigned work order sites");
      }
    }),
  ),

  getWorkOrderSiteOperatorAssignments: protectedProcedure
    .input(z.object({ work_order_site_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        const [woSite] = await ctx.db
          .select({
            site_id: workOrderSiteTable.site_id,
            office_id: workOrderTable.office_id,
          })
          .from(workOrderSiteTable)
          .innerJoin(
            workOrderTable,
            eq(workOrderSiteTable.work_order_id, workOrderTable.id),
          )
          .where(eq(workOrderSiteTable.id, work_order_site_id))
          .limit(1);
        if (!woSite) {
          throw notFound("Work order site", work_order_site_id);
        }
        await assertOfficeManager(ctx, woSite.office_id);

        try {
          const siteOperators = await ctx.db
            .select({
              user_id: userTable.id,
              name: userTable.name,
              email: userTable.email,
            })
            .from(userTable)
            .where(eq(userTable.role, constants.ROLES.SITE_OPERATOR));

          const assignedRows = await ctx.db
            .select({
              user_id: workOrderSiteUserTable.user_id,
              name: userTable.name,
              email: userTable.email,
            })
            .from(workOrderSiteUserTable)
            .innerJoin(
              userTable,
              eq(workOrderSiteUserTable.user_id, userTable.id),
            )
            .where(
              eq(
                workOrderSiteUserTable.work_order_site_id,
                work_order_site_id,
              ),
            );
          const assignedIds = new Set(assignedRows.map((r) => r.user_id));

          const byId = new Map<
            number,
            {
              user_id: number;
              name: string | null;
              email: string | null;
              assigned: boolean;
            }
          >();
          for (const o of siteOperators) {
            byId.set(o.user_id, {
              ...o,
              assigned: assignedIds.has(o.user_id),
            });
          }
          for (const a of assignedRows) {
            if (!byId.has(a.user_id)) {
              byId.set(a.user_id, { ...a, assigned: true });
            }
          }

          return [...byId.values()].sort((a, b) =>
            (a.name ?? "").localeCompare(b.name ?? ""),
          );
        } catch (error) {
          throw fromDatabaseError(
            error,
            "Fetching work order site operator assignments",
          );
        }
      }),
    ),

  getWorkOrderSiteOperatorsPaginated: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(20),
        search: z.string().optional().default(""),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id, page, limit, search } = input;

        const [woSite] = await ctx.db
          .select({ office_id: workOrderTable.office_id })
          .from(workOrderSiteTable)
          .innerJoin(
            workOrderTable,
            eq(workOrderSiteTable.work_order_id, workOrderTable.id),
          )
          .where(eq(workOrderSiteTable.id, work_order_site_id))
          .limit(1);
        if (!woSite) {
          throw notFound("Work order site", work_order_site_id);
        }
        await assertOfficeManager(ctx, woSite.office_id);

        try {
          const offset = (page - 1) * limit;

          let condition = eq(userTable.role, constants.ROLES.SITE_OPERATOR);
          if (search.trim() !== "") {
            condition =
              and(
                condition,
                or(
                  like(userTable.name, `%${escapeLike(search)}%`),
                  like(userTable.email, `%${escapeLike(search)}%`),
                ),
              ) ?? condition;
          }

          const [totalResult] = await ctx.db
            .select({ count: count() })
            .from(userTable)
            .where(condition);
          const total = totalResult?.count || 0;

          if (total === 0) {
            return {
              operators: [],
              pagination: { page, limit, total, hasMore: false, totalPages: 0 },
            };
          }

          const rows = await ctx.db
            .select({
              user_id: userTable.id,
              name: userTable.name,
              email: userTable.email,
              assigned_user_id: workOrderSiteUserTable.user_id,
            })
            .from(userTable)
            .leftJoin(
              workOrderSiteUserTable,
              and(
                eq(workOrderSiteUserTable.user_id, userTable.id),
                eq(
                  workOrderSiteUserTable.work_order_site_id,
                  work_order_site_id,
                ),
              ),
            )
            .where(condition)
            .orderBy(asc(userTable.name))
            .limit(limit)
            .offset(offset);

          const operators = rows.map((r) => ({
            user_id: r.user_id,
            name: r.name,
            email: r.email,
            assigned: r.assigned_user_id != null,
          }));

          return {
            operators,
            pagination: {
              page,
              limit,
              total,
              hasMore: offset + rows.length < total,
              totalPages: Math.ceil(total / limit),
            },
          };
        } catch (error) {
          throw fromDatabaseError(
            error,
            "Fetching paginated work order site operators",
          );
        }
      }),
    ),

  getWorkOrderSiteAssignedOperators: protectedProcedure
    .input(z.object({ work_order_site_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        const [woSite] = await ctx.db
          .select({ office_id: workOrderTable.office_id })
          .from(workOrderSiteTable)
          .innerJoin(
            workOrderTable,
            eq(workOrderSiteTable.work_order_id, workOrderTable.id),
          )
          .where(eq(workOrderSiteTable.id, work_order_site_id))
          .limit(1);
        if (!woSite) {
          throw notFound("Work order site", work_order_site_id);
        }
        await assertOfficeManager(ctx, woSite.office_id);

        try {
          const assigned = await ctx.db
            .select({
              user_id: workOrderSiteUserTable.user_id,
              name: userTable.name,
              email: userTable.email,
            })
            .from(workOrderSiteUserTable)
            .innerJoin(
              userTable,
              eq(workOrderSiteUserTable.user_id, userTable.id),
            )
            .where(
              eq(workOrderSiteUserTable.work_order_site_id, work_order_site_id),
            )
            .orderBy(asc(userTable.name));

          return assigned;
        } catch (error) {
          throw fromDatabaseError(
            error,
            "Fetching assigned work order site operators",
          );
        }
      }),
    ),

  getWorkOrderSitesBySite: protectedProcedure
    .input(z.object({ site_id: z.number().positive() }))
    .query(
      handleQuery(async ({ input, ctx }) => {
        const [site] = await ctx.db
          .select({ office_id: siteTable.office_id })
          .from(siteTable)
          .where(eq(siteTable.id, input.site_id))
          .limit(1);
        if (!site) {
          throw notFound("Site", input.site_id);
        }

        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessOffice(ctx.db, scope, site.office_id);

        try {
          const woSites = await ctx.db
            .select({
              work_order_site_id: workOrderSiteTable.id,
              work_order_id: workOrderTable.id,
              wo_code: workOrderTable.code,
              wo_title: workOrderTable.title,
              job_number: workOrderSiteTable.job_number,
              status: workOrderSiteTable.status,
            })
            .from(workOrderSiteTable)
            .innerJoin(
              workOrderTable,
              eq(workOrderSiteTable.work_order_id, workOrderTable.id),
            )
            .where(eq(workOrderSiteTable.site_id, input.site_id))
            .orderBy(desc(workOrderSiteTable.created_at));

          if (woSites.length === 0) return [];

          const ids = woSites.map((w) => w.work_order_site_id);
          const opRows = await ctx.db
            .select({
              work_order_site_id: workOrderSiteUserTable.work_order_site_id,
              user_id: workOrderSiteUserTable.user_id,
              name: userTable.name,
              email: userTable.email,
            })
            .from(workOrderSiteUserTable)
            .innerJoin(
              userTable,
              eq(workOrderSiteUserTable.user_id, userTable.id),
            )
            .where(inArray(workOrderSiteUserTable.work_order_site_id, ids));

          const byWoSite = new Map<
            number,
            { user_id: number; name: string | null; email: string | null }[]
          >();
          for (const r of opRows) {
            const arr = byWoSite.get(r.work_order_site_id) ?? [];
            arr.push({ user_id: r.user_id, name: r.name, email: r.email });
            byWoSite.set(r.work_order_site_id, arr);
          }

          return woSites.map((w) => ({
            ...w,
            operators: byWoSite.get(w.work_order_site_id) ?? [],
          }));
        } catch (error) {
          throw fromDatabaseError(error, "Fetching work order sites for site");
        }
      }),
    ),

  getOperatorUploads: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessWorkOrderSite(
            ctx.db,
            scope,
            work_order_site_id,
          );

          const uploads = await ctx.db
            .select({
              id: workOrderSiteOperatorUploadTable.id,
              work_order_site_id:
                workOrderSiteOperatorUploadTable.work_order_site_id,
              description: workOrderSiteOperatorUploadTable.description,
              file_name: workOrderSiteOperatorUploadTable.file_name,
              document_url: workOrderSiteOperatorUploadTable.document_url,
              document_id: workOrderSiteOperatorUploadTable.document_id,
              created_at: workOrderSiteOperatorUploadTable.created_at,
              uploaded_by_name: userTable.name,
            })
            .from(workOrderSiteOperatorUploadTable)
            .innerJoin(
              userTable,
              eq(
                workOrderSiteOperatorUploadTable.uploaded_by_user_id,
                userTable.id,
              ),
            )
            .where(
              eq(
                workOrderSiteOperatorUploadTable.work_order_site_id,
                work_order_site_id,
              ),
            )
            .orderBy(desc(workOrderSiteOperatorUploadTable.created_at));

          return uploads;
        } catch (error) {
          throw fromDatabaseError(error, "Fetching operator uploads");
        }
      }),
    ),

  getMeasurementSheets: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

          const sheets = await ctx.db
            .select()
            .from(workOrderSiteDocsTable)
            .where(
              and(
                eq(
                  workOrderSiteDocsTable.work_order_site_id,
                  work_order_site_id,
                ),
                eq(workOrderSiteDocsTable.type, "measurement_sheet"),
              ),
            );

          return sheets;
        } catch (error) {
          throw fromDatabaseError(error, "Fetching measurement sheets");
        }
      }),
    ),

  getWorkOrderSiteDetails: protectedProcedure
    .input(getWorkOrderSiteDetailsSchema)
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

          const woSites = await ctx.db
            .select({
              id: workOrderSiteTable.id,
              work_order_id: workOrderSiteTable.work_order_id,
              client_id: workOrderSiteTable.client_id,
              site_id: workOrderSiteTable.site_id,
              date: workOrderSiteTable.date,
              end_date: workOrderSiteTable.end_date,
              process_type: workOrderSiteTable.process_type,
              job_number: workOrderSiteTable.job_number,
              area: workOrderSiteTable.area,
              installation_type: workOrderSiteTable.installation_type,
              joint_estimate_number: workOrderSiteTable.joint_estimate_number,
              land_owner_name: workOrderSiteTable.land_owner_name,
              remarks: workOrderSiteTable.remarks,
              status: workOrderSiteTable.status,
              created_at: workOrderSiteTable.created_at,
              updated_at: workOrderSiteTable.updated_at,
              site_name: siteTable.name,
              site_address: siteTable.address,
              site_city: siteTable.city,
              site_state: siteTable.state,
              site_pincode: siteTable.pincode,
              wo_code: workOrderTable.code,
              wo_title: workOrderTable.title,
              wo_process_type: workOrderTable.process_type,
              wo_office_id: workOrderTable.office_id,
            })
            .from(workOrderSiteTable)
            .leftJoin(siteTable, eq(workOrderSiteTable.site_id, siteTable.id))
            .leftJoin(
              workOrderTable,
              eq(workOrderSiteTable.work_order_id, workOrderTable.id),
            )
            .where(eq(workOrderSiteTable.id, work_order_site_id));

          if (woSites.length === 0) {
            return null;
          }

          const woSite = woSites[0]!;

          const activities = await ctx.db
            .select()
            .from(siteActivityTable)
            .where(
              eq(siteActivityTable.work_order_site_id, work_order_site_id),
            );

          return {
            id: woSite.id,
            work_order_id: woSite.work_order_id,
            client_id: woSite.client_id,
            site_id: woSite.site_id,
            date: woSite.date,
            end_date: woSite.end_date,
            process_type: woSite.process_type,
            job_number: woSite.job_number,
            area: woSite.area,
            installation_type: woSite.installation_type,
            joint_estimate_number: woSite.joint_estimate_number,
            land_owner_name: woSite.land_owner_name,
            remarks: woSite.remarks,
            status: woSite.status,
            created_at: woSite.created_at,
            updated_at: woSite.updated_at,
            site: {
              id: woSite.site_id,
              name: woSite.site_name,
              address: woSite.site_address,
              city: woSite.site_city,
              state: woSite.site_state,
              pincode: woSite.site_pincode,
            },
            work_order: {
              id: woSite.work_order_id,
              code: woSite.wo_code,
              title: woSite.wo_title,
              process_type: woSite.wo_process_type,
              office_id: woSite.wo_office_id,
            },
            activities,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching work order site details");
        }
      }),
    ),

  getSiteActivities: protectedProcedure.input(getSiteActivitiesSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { work_order_site_id } = input;

      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

        const activities = await ctx.db
          .select({
            id: siteActivityTable.id,
            work_order_site_id: siteActivityTable.work_order_site_id,
            schedule_of_rates_id: siteActivityTable.schedule_of_rates_id,
            activity: siteActivityTable.activity,
            unit: siteActivityTable.unit,
            created_at: siteActivityTable.created_at,
            updated_at: siteActivityTable.updated_at,
            rate: scheduleOfRatesTable.unit_rate_inc_gst,
            sor_estimated_quantity: scheduleOfRatesTable.estimated_quantity,
          })
          .from(siteActivityTable)
          .leftJoin(
            scheduleOfRatesTable,
            eq(siteActivityTable.schedule_of_rates_id, scheduleOfRatesTable.id),
          )
          .where(eq(siteActivityTable.work_order_site_id, work_order_site_id));

        if (activities.length === 0) return [];

        const sorIds = activities
          .map((a: any) => a.schedule_of_rates_id)
          .filter(Boolean) as number[];

        const allSiteActivities = await ctx.db
          .select({
            id: siteActivityTable.id,
            schedule_of_rates_id: siteActivityTable.schedule_of_rates_id,
          })
          .from(siteActivityTable)
          .where(inArray(siteActivityTable.schedule_of_rates_id, sorIds));

        const saIds = allSiteActivities.map((sa: any) => sa.id);

        if (saIds.length > 0) {
          const relatedSites = await ctx.db
            .select({
              id: workOrderSiteTable.id,
            })
            .from(workOrderSiteTable)
            .where(
              inArray(
                workOrderSiteTable.work_order_id,
                ctx.db
                  .select({ id: workOrderTable.id })
                  .from(workOrderTable)
                  .where(
                    inArray(
                      workOrderTable.id,
                      ctx.db
                        .select({ id: scheduleOfRatesTable.work_order_id })
                        .from(scheduleOfRatesTable)
                        .where(inArray(scheduleOfRatesTable.id, sorIds)),
                    ),
                  ),
              ),
            );

          const siteIds = relatedSites.map((s: any) => s.id);

          const [q1, q2, q3, q4, q5, q6] = await Promise.all([
            ctx.db
              .select()
              .from(cleaningUpSoilAreaTable)
              .where(
                inArray(cleaningUpSoilAreaTable.work_order_site_id, siteIds),
              ),
            ctx.db
              .select()
              .from(liftingRecoveryOilSlushTable)
              .where(
                inArray(
                  liftingRecoveryOilSlushTable.work_order_site_id,
                  siteIds,
                ),
              ),
            ctx.db
              .select()
              .from(excavationContSoilTable)
              .where(
                inArray(excavationContSoilTable.work_order_site_id, siteIds),
              ),
            ctx.db
              .select()
              .from(transportationContSoilTable)
              .where(
                inArray(
                  transportationContSoilTable.work_order_site_id,
                  siteIds,
                ),
              ),
            ctx.db
              .select()
              .from(refillingExcavatedContSoilTable)
              .where(
                inArray(
                  refillingExcavatedContSoilTable.work_order_site_id,
                  siteIds,
                ),
              ),
            ctx.db
              .select()
              .from(bioremediationContSoilTable)
              .where(
                inArray(
                  bioremediationContSoilTable.work_order_site_id,
                  siteIds,
                ),
              ),
          ]);

          const entriesByTable = [
            {
              entries: q1,
              name: "clean_soil_area",
            },
            {
              entries: q2,
              name: "lifting_oily_slush_or_recovery_of_oil",
            },
            {
              entries: q3,
              name: "excavation_oil_contaminated_soil",
            },
            {
              entries: q4,
              name: "transportation_contaminated_soil",
            },
            {
              entries: q5,
              name: "refilling_excavated_oil_contaminated_soil_land",
            },
            {
              entries: q6,
              name: "bioremediation_oil_contaminated_soil",
            },
          ];

          const allOilZappingEntries = await ctx.db
            .select()
            .from(bioOilZappingTable)
            .where(inArray(bioOilZappingTable.work_order_site_id, siteIds));

          const oilZappingBySite = new Map<number, number>();
          for (const entry of allOilZappingEntries) {
            const current = oilZappingBySite.get(entry.work_order_site_id) || 0;
            oilZappingBySite.set(
              entry.work_order_site_id,
              current + parseFloat(entry.estimated_quantity || "0"),
            );
          }

          const utilizationMap = new Map<number, number>();
          const completionUtilizationMap = new Map<number, number>();

          for (const sorId of sorIds) {
            let totalUsed = 0;
            let totalCompletion = 0;
            const relatedSaEntries = await ctx.db
              .select()
              .from(siteActivityTable)
              .where(eq(siteActivityTable.schedule_of_rates_id, sorId));

            for (const sa of relatedSaEntries) {
              const isBioremActivity =
                sa.activity === "bioremediation_oil_contaminated_soil";

              if (isBioremActivity) {
                const siteOilZappingQty =
                  oilZappingBySite.get(sa.work_order_site_id) || 0;
                totalUsed += siteOilZappingQty;

                const bioremEntries = entriesByTable
                  .find((t) => t.name === "bioremediation_oil_contaminated_soil")
                  ?.entries.filter(
                    (e: any) =>
                      e.work_order_site_id === sa.work_order_site_id &&
                      e.type === "completion",
                  ) || [];
                const bioremCompletionQty = bioremEntries.reduce(
                  (sum: number, e: any) =>
                    sum + parseFloat(e.estimated_quantity || "0"),
                  0,
                );
                totalCompletion += bioremCompletionQty;
                continue;
              }

              const saEntries: any[] = [];
              for (const table of entriesByTable) {
                const matched = table.entries.filter(
                  (e: any) =>
                    e.site_activity_id === sa.id ||
                    (e.work_order_site_id === sa.work_order_site_id &&
                      table.name === sa.activity),
                );
                saEntries.push(...matched);
              }

              if (saEntries.length === 0) continue;

              const completion = saEntries.find((e: any) => e.type === "completion");
              const estimate = saEntries.find(
                (e: any) => e.type === "estimate_sub-wo",
              );

              const bestQty = parseFloat(
                (completion || estimate)?.estimated_quantity || "0",
              );
              totalUsed += bestQty;

              const completionQty = parseFloat(
                completion?.estimated_quantity || "0",
              );
              totalCompletion += completionQty;
            }
            utilizationMap.set(sorId, totalUsed);
            completionUtilizationMap.set(sorId, totalCompletion);
          }

          return activities.map((a: any) => ({
            ...a,
            total_used_quantity: (
              utilizationMap.get(a.schedule_of_rates_id!) || 0
            ).toFixed(2),
            total_completion_quantity: (
              completionUtilizationMap.get(a.schedule_of_rates_id!) || 0
            ).toFixed(2),
          }));
        }

        return activities.map((a: any) => ({
          ...a,
          total_used_quantity: "0.00",
          total_completion_quantity: "0.00",
        }));
      } catch (error) {
        throw fromDatabaseError(error, "Fetching site activities");
      }
    }),
  ),

  getSiteDocuments: protectedProcedure.input(getSiteDocumentsSchema).query(
    handleQuery(async ({ input, ctx }) => {
      const { work_order_site_id } = input;

      try {
        const scope = await getAccessScope(
          ctx.db,
          Number(ctx.user!.sub),
          ctx.user!.role,
        );
        await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

        const documents = await ctx.db
          .select()
          .from(workOrderSiteDocsTable)
          .where(
            eq(workOrderSiteDocsTable.work_order_site_id, work_order_site_id),
          );

        return documents;
      } catch (error) {
        throw fromDatabaseError(error, "Fetching site documents");
      }
    }),
  ),

  getBioremediationData: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

          const contaminatedSoil = await ctx.db
            .select()
            .from(bioremediationContSoilTable)
            .where(
              eq(
                bioremediationContSoilTable.work_order_site_id,
                work_order_site_id,
              ),
            );

          const bioSamples = await ctx.db
            .select()
            .from(bioSampleTable)
            .where(eq(bioSampleTable.work_order_site_id, work_order_site_id))
            .orderBy(desc(bioSampleTable.id));

          const oilZapping = await ctx.db
            .select()
            .from(bioOilZappingTable)
            .where(
              eq(bioOilZappingTable.work_order_site_id, work_order_site_id),
            )
            .orderBy(desc(bioOilZappingTable.id));

          return {
            contaminatedSoil,
            bioSamples,
            oilZapping,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching bioremediation data");
        }
      }),
    ),

  getRestorationData: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
      }),
    )
    .query(
      handleQuery(async ({ input, ctx }) => {
        const { work_order_site_id } = input;

        try {
          const scope = await getAccessScope(
            ctx.db,
            Number(ctx.user!.sub),
            ctx.user!.role,
          );
          await assertCanAccessWorkOrderSite(ctx.db, scope, work_order_site_id);

          const cleaningUpSoilArea = await ctx.db
            .select()
            .from(cleaningUpSoilAreaTable)
            .where(
              eq(
                cleaningUpSoilAreaTable.work_order_site_id,
                work_order_site_id,
              ),
            );

          const liftingRecoveryOilSlush = await ctx.db
            .select()
            .from(liftingRecoveryOilSlushTable)
            .where(
              eq(
                liftingRecoveryOilSlushTable.work_order_site_id,
                work_order_site_id,
              ),
            );

          const excavationContSoil = await ctx.db
            .select()
            .from(excavationContSoilTable)
            .where(
              eq(
                excavationContSoilTable.work_order_site_id,
                work_order_site_id,
              ),
            );

          const transportationContSoil = await ctx.db
            .select()
            .from(transportationContSoilTable)
            .where(
              eq(
                transportationContSoilTable.work_order_site_id,
                work_order_site_id,
              ),
            );

          const refillingExcavatedContSoil = await ctx.db
            .select()
            .from(refillingExcavatedContSoilTable)
            .where(
              eq(
                refillingExcavatedContSoilTable.work_order_site_id,
                work_order_site_id,
              ),
            );

          return {
            cleaningUpSoilArea,
            liftingRecoveryOilSlush,
            excavationContSoil,
            transportationContSoil,
            refillingExcavatedContSoil,
          };
        } catch (error) {
          throw fromDatabaseError(error, "Fetching restoration data");
        }
      }),
    ),
});

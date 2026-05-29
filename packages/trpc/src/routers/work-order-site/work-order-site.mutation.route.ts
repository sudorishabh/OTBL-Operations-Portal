import { eq, and, inArray } from "drizzle-orm";
import { schema } from "@pkg/db";
import { TRPCError } from "@trpc/server";
import { router } from "../../trpc";
import { publicProcedure, protectedProcedure } from "../../core";
import {
  assertCanAccessWorkOrderSite,
  getAccessScope,
} from "../../access-scope";
import { assertOfficeManager } from "../../helper/office-permissions";
import { handleMutation } from "../../helper/typed-handler";
import { z } from "zod";
import { fromDatabaseError, notFound, validationError } from "../../errors";
import { constants } from "@pkg/utils";
import {
  getSharePointConfig,
  isSharePointConfigured,
} from "../sharepoint/sharepoint.config";
import { createSharePointService } from "../sharepoint/sharepoint.service";

// Define schemas locally
const createSiteActivitySchema = z.object({
  work_order_site_id: z.number().positive(),
  activity: z.string().min(1).max(255),
});

const updateSiteActivitySchema = z.object({
  id: z.number().positive(),
  activity: z.string().min(1).max(255).optional(),
});

const deleteSiteActivitySchema = z.object({
  id: z.number().positive(),
});

// Schema for site documents
const createSiteDocumentSchema = z.object({
  work_order_site_id: z.number().positive(),
  document_url: z.string().min(1).max(255),
  document_id: z.string().min(1).max(255).optional(),
  type: z.enum([
    "sub_wo",
    "estimate",
    "completion",
    "measurement_sheet",
    "bills",
    "completion_certificate",
  ]),
});

const deleteSiteDocumentSchema = z.object({
  id: z.number().positive(),
});

// Phase Schemas
const saveActivityDataSchema = z.object({
  estimated_quantity: z.string(),
  amount: z.string().optional(),
  transportation_km: z.string().optional(),
});

type SaveActivityData = z.infer<typeof saveActivityDataSchema>;

const createBioSampleSchema = z.object({
  work_order_site_id: z.number().positive(),
  tph_document_url: z.string(),
  tph_value: z.string(),
  application_month: z.string(),
});

const createOilZappingSchema = z.object({
  work_order_site_id: z.number().positive(),
  document_url: z.string().min(1, "Document URL is required"),
  estimated_quantity: z
    .string()
    .min(1, "Quantity is required")
    .refine((v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0, {
      message: "Quantity must be a positive number",
    }),
});

const deleteRecordSchema = z.object({
  id: z.number().positive(),
});

const saveBioremediationPhaseSchema = z.object({
  work_order_site_id: z.number().positive(),
  phase: z.enum(["estimate_sub-wo", "completion"]),
  contaminated_soil: saveActivityDataSchema.optional(),
  // Keeping these optional arrays for backward compatibility or bulk updates if needed,
  // though we are moving to granular mutations for these.
  bio_samples: z
    .array(
      z.object({
        tph_document_url: z.string(),
        tph_value: z.string(),
        application_month: z.string(),
      }),
    )
    .optional(),
  oil_zapping: z
    .array(
      z.object({
        document_url: z.string(),
        estimated_quantity: z.string().optional(),
      }),
    )
    .optional(),
});

const saveRestorationPhaseSchema = z.object({
  work_order_site_id: z.number().positive(),
  phase: z.enum(["estimate_sub-wo", "completion"]),
  document_url: z.string().optional(),
  sub_wo_document_url: z.string().optional(),
  estimate_document_url: z.string().optional(),
  clean_soil_area: saveActivityDataSchema.optional(),
  lifting_oil_slush: saveActivityDataSchema.optional(),
  excav_cont_soil: saveActivityDataSchema.optional(),
  trans_cont_soil: saveActivityDataSchema.optional(),
  refill_excav_soil: saveActivityDataSchema.optional(),
});

const {
  siteActivityTable,
  workOrderTable,
  workOrderSiteTable,
  workOrderSiteUserTable,
  siteUserTable,
  workOrderSiteOperatorUploadTable,
  workOrderSiteDocsTable,
  bioremediationContSoilTable,
  bioSampleTable,
  bioOilZappingTable,
  cleaningUpSoilAreaTable,
  liftingRecoveryOilSlushTable,
  excavationContSoilTable,
  transportationContSoilTable,
  refillingExcavatedContSoilTable,
} = schema;

export const workOrderSiteMutationRouter = router({
  /**
   * Assign operators to a work-order site row. Replaces existing assignments for that row.
   * Managers/Admins can assign; caller must be able to access the work order site (office manager / WO-site operator).
   */
  setWorkOrderSiteOperators: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        user_ids: z.array(z.number().positive()),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { work_order_site_id, user_ids } = input;

        // Resolve the WO-site's master site + owning office. Assigning
        // operators is an office-management action, so only that office's
        // manager (or an admin) may do it — an operator assigned to the
        // WO-site must NOT be able to reassign it. (Kept outside the try
        // below so the permission check surfaces as 403/404, not a generic
        // DB error.)
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

        // An operator may only be pinned to a WO-site if they are already an
        // operator on that WO-site's master site. Keeps the two-tier model
        // coherent and blocks assigning arbitrary users.
        if (user_ids.length > 0) {
          const siteOperators = await ctx.db
            .select({ user_id: siteUserTable.user_id })
            .from(siteUserTable)
            .where(
              and(
                eq(siteUserTable.site_id, woSite.site_id),
                inArray(siteUserTable.user_id, user_ids),
              ),
            );
          const allowed = new Set(siteOperators.map((r) => r.user_id));
          const invalid = user_ids.filter((id) => !allowed.has(id));
          if (invalid.length > 0) {
            throw validationError(
              `Users not assigned to this site cannot be added: ${invalid.join(", ")}`,
              undefined,
              {
                userMessage:
                  "You can only assign operators who belong to this site.",
              },
            );
          }
        }

        try {
          await ctx.db.transaction(async (tx: any) => {
            await tx
              .delete(workOrderSiteUserTable)
              .where(
                eq(
                  workOrderSiteUserTable.work_order_site_id,
                  work_order_site_id,
                ),
              );

            if (user_ids.length > 0) {
              await tx.insert(workOrderSiteUserTable).values(
                user_ids.map((user_id) => ({
                  work_order_site_id,
                  user_id,
                })),
              );
            }
          });

          return { success: true };
        } catch (error) {
          throw fromDatabaseError(error, "Saving work order site operators");
        }
      }),
    ),

  /** Operator uploads: description + SharePoint URL/id; file bytes live in SharePoint. */
  createOperatorUpload: protectedProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        description: z.string().min(1).max(8000),
        document_url: z.string().min(1),
        document_id: z.string().max(255).optional(),
        file_name: z.string().max(512).optional(),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const userId = Number(ctx.user!.sub);
        const scope = await getAccessScope(
          ctx.db,
          userId,
          ctx.user!.role,
        );
        await assertCanAccessWorkOrderSite(
          ctx.db,
          scope,
          input.work_order_site_id,
        );

        try {
          const [result] = await ctx.db
            .insert(workOrderSiteOperatorUploadTable)
            .values({
              work_order_site_id: input.work_order_site_id,
              uploaded_by_user_id: userId,
              description: input.description,
              document_url: input.document_url,
              document_id: input.document_id,
              file_name: input.file_name,
            });

          return {
            success: true,
            id: Number(result.insertId),
            message: "Document uploaded successfully",
          };
        } catch (error) {
          throw fromDatabaseError(error, "Creating operator upload");
        }
      }),
    ),

  deleteOperatorUpload: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const userId = Number(ctx.user!.sub);
        const scope = await getAccessScope(
          ctx.db,
          userId,
          ctx.user!.role,
        );

        const rows = await ctx.db
          .select()
          .from(workOrderSiteOperatorUploadTable)
          .where(eq(workOrderSiteOperatorUploadTable.id, input.id))
          .limit(1);

        const row = rows[0];
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Upload not found",
          });
        }

        await assertCanAccessWorkOrderSite(
          ctx.db,
          scope,
          row.work_order_site_id,
        );

        if (row.document_id && isSharePointConfigured(ctx.appEnv)) {
          try {
            const config = getSharePointConfig(ctx.appEnv);
            const service = createSharePointService(config);
            await service.deleteFile(row.document_id);
          } catch (spError) {
            console.error("Failed to delete from SharePoint:", spError);
          }
        }

        await ctx.db
          .delete(workOrderSiteOperatorUploadTable)
          .where(eq(workOrderSiteOperatorUploadTable.id, input.id));

        return {
          success: true,
          message: "Document deleted successfully",
        };
      }),
    ),

  // Create a measurement sheet
  createMeasurementSheet: publicProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        document_url: z.string().min(1).max(255),
        document_id: z.string().min(1).max(255).optional(),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { work_order_site_id, document_url, document_id } = input;

        try {
          const [result] = await ctx.db.insert(workOrderSiteDocsTable).values({
            work_order_site_id,
            document_url,
            document_id,
            type: "measurement_sheet",
          });

          return {
            success: true,
            id: Number(result.insertId),
            message: "Measurement sheet added successfully",
          };
        } catch (error) {
          throw fromDatabaseError(error, "Creating measurement sheet");
        }
      }),
    ),

  // Delete a measurement sheet
  deleteMeasurementSheet: publicProcedure
    .input(
      z.object({
        id: z.number().positive(),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        try {
          // 1. Get the document to find the document_id
          const docs = await ctx.db
            .select()
            .from(workOrderSiteDocsTable)
            .where(eq(workOrderSiteDocsTable.id, input.id))
            .limit(1);

          const doc = docs[0];

          if (doc && doc.document_id && isSharePointConfigured(ctx.appEnv)) {
            try {
              const config = getSharePointConfig(ctx.appEnv);
              const service = createSharePointService(config);
              await service.deleteFile(doc.document_id);
            } catch (spError) {
              console.error("Failed to delete from SharePoint:", spError);
              // We continue with DB deletion even if SP deletion fails
            }
          }

          await ctx.db
            .delete(workOrderSiteDocsTable)
            .where(eq(workOrderSiteDocsTable.id, input.id));

          return {
            success: true,
            message: "Measurement sheet deleted successfully",
          };
        } catch (error) {
          throw fromDatabaseError(error, "Deleting measurement sheet");
        }
      }),
    ),

  // Create a site activity
  // createSiteActivity  : publicProcedure.input(createSiteActivitySchema).mutation(
  //     handleMutation(async ({ input, ctx }) => {
  //       const { work_order_site_id, activity } = input;

  //       try {
  //         const [result] = await ctx.db.insert(siteActivityTable).values({
  //           work_order_site_id,
  //           activity,
  //           unit,
  //         });

  //         return {
  //           success: true,
  //           id: Number(result.insertId),
  //           message: "Activity created successfully",
  //         };
  //       } catch (error) {
  //         throw fromDatabaseError(error, "Creating site activity");
  //       }
  //     }),
  //   ),

  // Update a site activity
  updateSiteActivity: publicProcedure.input(updateSiteActivitySchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      try {
        await ctx.db
          .update(siteActivityTable)
          .set(updateData)
          .where(eq(siteActivityTable.id, id));

        return {
          success: true,
          message: "Activity updated successfully",
        };
      } catch (error) {
        throw fromDatabaseError(error, "Updating site activity");
      }
    }),
  ),

  // Delete a site activity
  deleteSiteActivity: publicProcedure.input(deleteSiteActivitySchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
        await ctx.db
          .delete(siteActivityTable)
          .where(eq(siteActivityTable.id, input.id));

        return {
          success: true,
          message: "Activity deleted successfully",
        };
      } catch (error) {
        throw fromDatabaseError(error, "Deleting site activity");
      }
    }),
  ),

  // Create a site document
  createSiteDocument: publicProcedure.input(createSiteDocumentSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { work_order_site_id, document_url, document_id, type } = input;

      try {
        const [result] = await ctx.db.insert(workOrderSiteDocsTable).values({
          work_order_site_id,
          document_url,
          document_id,
          type: type as any,
        } as any);

        return {
          success: true,
          id: Number(result.insertId),
          message: "Document uploaded successfully",
        };
      } catch (error) {
        throw fromDatabaseError(error, "Creating site document");
      }
    }),
  ),

  // Delete a site document
  deleteSiteDocument: publicProcedure.input(deleteSiteDocumentSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
        // 1. Get the document to find the document_id
        const docs = await ctx.db
          .select()
          .from(workOrderSiteDocsTable)
          .where(eq(workOrderSiteDocsTable.id, input.id))
          .limit(1);

        const doc = docs[0];

        if (doc && doc.document_id && isSharePointConfigured(ctx.appEnv)) {
          try {
            const config = getSharePointConfig(ctx.appEnv);
            const service = createSharePointService(config);
            await service.deleteFile(doc.document_id);
          } catch (spError) {
            console.error("Failed to delete from SharePoint:", spError);
            // We continue with DB deletion even if SP deletion fails
          }
        }

        await ctx.db
          .delete(workOrderSiteDocsTable)
          .where(eq(workOrderSiteDocsTable.id, input.id));

        return {
          success: true,
          message: "Document deleted successfully",
        };
      } catch (error) {
        throw fromDatabaseError(error, "Deleting site document");
      }
    }),
  ),

  // =====================================
  // NEW PHASE BASED MUTATIONS
  // =====================================

  saveContaminatedSoil: publicProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        phase: z.enum(["sub_wo", "estimate", "completion", "estimate_sub-wo"]),
        document_url: z.string().optional(),
        sub_wo_document_url: z.string().optional(),
        estimate_document_url: z.string().optional(),
        data: saveActivityDataSchema,
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const {
          work_order_site_id,
          phase,
          data,
          document_url,
          sub_wo_document_url,
          estimate_document_url,
        } = input;
        try {
          const upsertDoc = async (url: string, type: string) => {
            const existingDoc = await ctx.db
              .select()
              .from(workOrderSiteDocsTable)
              .where(
                and(
                  eq(
                    workOrderSiteDocsTable.work_order_site_id,
                    work_order_site_id,
                  ),
                  eq(workOrderSiteDocsTable.type, type as any),
                ),
              );

            if (existingDoc.length > 0) {
              await ctx.db
                .update(workOrderSiteDocsTable)
                .set({ document_url: url })
                .where(eq(workOrderSiteDocsTable.id, existingDoc[0]!.id));
            } else {
              await ctx.db.insert(workOrderSiteDocsTable).values({
                work_order_site_id,
                type: type as any,
                document_url: url,
              });
            }
          };

          if (document_url && phase !== "estimate_sub-wo") {
            await upsertDoc(document_url, phase);
          }
          if (sub_wo_document_url) {
            await upsertDoc(sub_wo_document_url, "sub_wo");
          }
          if (estimate_document_url) {
            await upsertDoc(estimate_document_url, "estimate");
          }

          const activityType =
            phase === "completion" ? "completion" : "estimate_sub-wo";

          // Fetch site activity ID for bioremediation
          const siteActivities = await ctx.db
            .select()
            .from(siteActivityTable)
            .where(
              and(
                eq(siteActivityTable.work_order_site_id, work_order_site_id),
                eq(
                  siteActivityTable.activity,
                  constants.WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL,
                ),
              ),
            );

          const siteActivityId = siteActivities[0]?.id;

          const existing = await ctx.db
            .select()
            .from(bioremediationContSoilTable)
            .where(
              and(
                eq(
                  bioremediationContSoilTable.work_order_site_id,
                  work_order_site_id,
                ),
                eq(bioremediationContSoilTable.type, activityType as any),
              ),
            );

          if (existing.length > 0) {
            await ctx.db
              .update(bioremediationContSoilTable)
              .set({ ...data, site_activity_id: siteActivityId })
              .where(eq(bioremediationContSoilTable.id, existing[0]!.id));
          } else {
            await ctx.db.insert(bioremediationContSoilTable).values({
              work_order_site_id,
              site_activity_id: siteActivityId,
              type: activityType as any,
              ...data,
            } as any);
          }

          if (phase === "completion") {
            await ctx.db
              .update(workOrderSiteTable)
              .set({ is_completed: true })
              .where(eq(workOrderSiteTable.id, work_order_site_id));
          }

          return { success: true, message: "Contaminated Soil saved" };
        } catch (error) {
          throw fromDatabaseError(error, "Saving contaminated soil");
        }
      }),
    ),

  createBioSample: publicProcedure.input(createBioSampleSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
        const [result] = await ctx.db.insert(bioSampleTable).values({
          work_order_site_id: input.work_order_site_id,
          tph_document_url: input.tph_document_url,
          tph_value: input.tph_value,
          application_month: input.application_month,
        });
        return {
          success: true,
          message: "Bio sample added successfully",
          id: Number(result.insertId),
        };
      } catch (error) {
        throw fromDatabaseError(error, "Creating bio sample");
      }
    }),
  ),

  deleteBioSample: publicProcedure.input(deleteRecordSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
        await ctx.db
          .delete(bioSampleTable)
          .where(eq(bioSampleTable.id, input.id));
        return { success: true, message: "Bio sample deleted successfully" };
      } catch (error) {
        throw fromDatabaseError(error, "Deleting bio sample");
      }
    }),
  ),

  createOilZapping: publicProcedure.input(createOilZappingSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
        // Enforce: total oil zapping qty for a site cannot exceed contaminated-soil estimate qty.
        const estimateRows = await ctx.db
          .select({ estimated_quantity: bioremediationContSoilTable.estimated_quantity })
          .from(bioremediationContSoilTable)
          .where(
            and(
              eq(bioremediationContSoilTable.work_order_site_id, input.work_order_site_id),
              eq(bioremediationContSoilTable.type, "estimate_sub-wo" as any),
            ),
          );

        const estimateLimit = parseFloat(estimateRows[0]?.estimated_quantity || "0") || 0;
        if (estimateLimit <= 0) {
          throw new Error("Please save the Contaminated Soil estimate quantity first.");
        }

        const existingOil = await ctx.db
          .select({ estimated_quantity: bioOilZappingTable.estimated_quantity })
          .from(bioOilZappingTable)
          .where(eq(bioOilZappingTable.work_order_site_id, input.work_order_site_id));

        const currentTotal = existingOil.reduce(
          (sum: number, r: any) => sum + (parseFloat(r.estimated_quantity || "0") || 0),
          0,
        );

        const remaining = estimateLimit - currentTotal;
        if (remaining <= 0) {
          throw new Error("Oil zapping limit already reached for this site.");
        }

        const requested = parseFloat(input.estimated_quantity || "0") || 0;
        const capped = Math.min(requested, remaining);

        const [result] = await ctx.db.insert(bioOilZappingTable).values({
          work_order_site_id: input.work_order_site_id,
          document_url: input.document_url,
          estimated_quantity: capped.toFixed(2),
        });
        return {
          success: true,
          message: "Oil zapping entry added successfully",
          id: Number(result.insertId),
        };
      } catch (error) {
        throw fromDatabaseError(error, "Creating oil zapping entry");
      }
    }),
  ),

  deleteOilZapping: publicProcedure.input(deleteRecordSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
        await ctx.db
          .delete(bioOilZappingTable)
          .where(eq(bioOilZappingTable.id, input.id));
        return {
          success: true,
          message: "Oil zapping entry deleted successfully",
        };
      } catch (error) {
        throw fromDatabaseError(error, "Deleting oil zapping entry");
      }
    }),
  ),

  // Keeping the bulk save for backward compatibility or if needed later,
  // but the UI will switch to granular mutations.
  saveBioSamples: publicProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        data: z.array(
          z.object({
            tph_document_url: z.string(),
            tph_value: z.string(),
            application_month: z.string(),
          }),
        ),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { work_order_site_id, data } = input;
        try {
          await ctx.db.transaction(async (tx: any) => {
            await tx
              .delete(bioSampleTable)
              .where(eq(bioSampleTable.work_order_site_id, work_order_site_id));

            if (data.length > 0) {
              await tx.insert(bioSampleTable).values(
                data.map((sample) => ({
                  work_order_site_id,
                  ...sample,
                })),
              );
            }
          });
          return { success: true, message: "Bio Samples saved" };
        } catch (error) {
          throw fromDatabaseError(error, "Saving bio samples");
        }
      }),
    ),

  saveOilZapping: publicProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        data: z.array(
          z.object({
            document_url: z.string(),
            estimated_quantity: z
              .string()
              .min(1, "Quantity is required")
              .refine(
                (v) => Number.isFinite(parseFloat(v)) && parseFloat(v) > 0,
                { message: "Quantity must be a positive number" },
              ),
          }),
        ),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { work_order_site_id, data } = input;
        try {
          await ctx.db.transaction(async (tx: any) => {
            const estimateRows = await tx
              .select({
                estimated_quantity: bioremediationContSoilTable.estimated_quantity,
              })
              .from(bioremediationContSoilTable)
              .where(
                and(
                  eq(bioremediationContSoilTable.work_order_site_id, work_order_site_id),
                  eq(bioremediationContSoilTable.type, "estimate_sub-wo" as any),
                ),
              );

            const estimateLimit =
              parseFloat(estimateRows[0]?.estimated_quantity || "0") || 0;
            if (estimateLimit <= 0) {
              throw new Error(
                "Please save the Contaminated Soil estimate quantity first.",
              );
            }

            await tx
              .delete(bioOilZappingTable)
              .where(
                eq(bioOilZappingTable.work_order_site_id, work_order_site_id),
              );

            if (data.length > 0) {
              let remaining = estimateLimit;
              const rowsToInsert: any[] = [];

              for (const item of data) {
                if (remaining <= 0) break;
                const requested = parseFloat(item.estimated_quantity || "0") || 0;
                const capped = Math.min(requested, remaining);
                if (capped <= 0) continue;
                remaining -= capped;
                rowsToInsert.push({
                  work_order_site_id,
                  document_url: item.document_url,
                  estimated_quantity: capped.toFixed(2),
                });
              }

              if (rowsToInsert.length === 0) {
                throw new Error("Oil zapping limit already reached for this site.");
              }

              await tx.insert(bioOilZappingTable).values(rowsToInsert);
            }
          });
          return { success: true, message: "Oil Zapping saved" };
        } catch (error) {
          throw fromDatabaseError(error, "Saving oil zapping");
        }
      }),
    ),

  saveBioremediationPhase: publicProcedure
    .input(saveBioremediationPhaseSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const { work_order_site_id, phase, contaminated_soil } = input;

        const upsertActivity = async (
          tx: any,
          table: any,
          data: SaveActivityData | undefined,
          activityName: string,
        ) => {
          if (!data) return;

          const sa = await tx
            .select()
            .from(siteActivityTable)
            .where(
              and(
                eq(siteActivityTable.work_order_site_id, work_order_site_id),
                eq(siteActivityTable.activity, activityName),
              ),
            );

          const siteActivityId = sa[0]?.id;
          const activityType =
            phase === "completion" ? "completion" : "estimate_sub-wo";

          const existing = await tx
            .select()
            .from(table)
            .where(
              and(
                eq(table.work_order_site_id, work_order_site_id),
                eq(table.type, activityType),
              ),
            );

          if (existing.length > 0) {
            await tx
              .update(table)
              .set({
                estimated_quantity: data.estimated_quantity,
                amount: data.amount,
                transportation_km: data.transportation_km,
                site_activity_id: siteActivityId,
              })
              .where(eq(table.id, existing[0]!.id));
          } else {
            await tx.insert(table).values({
              work_order_site_id,
              site_activity_id: siteActivityId,
              type: activityType,
              estimated_quantity: data.estimated_quantity,
              amount: data.amount,
              transportation_km: data.transportation_km,
            });
          }
        };

        try {
          await ctx.db.transaction(async (tx: any) => {
            await upsertActivity(
              tx,
              bioremediationContSoilTable,
              contaminated_soil,
              "contaminated_soil",
            );

            if (phase === "completion") {
              await tx
                .update(workOrderSiteTable)
                .set({ is_completed: true })
                .where(eq(workOrderSiteTable.id, work_order_site_id));
            }
          });

          return {
            success: true,
            message: "Bioremediation phase data saved successfully",
          };
        } catch (error) {
          throw fromDatabaseError(error, "Saving bioremediation phase data");
        }
      }),
    ),

  saveRestorationPhase: publicProcedure
    .input(saveRestorationPhaseSchema)
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        const {
          work_order_site_id,
          phase,
          document_url,
          sub_wo_document_url,
          estimate_document_url,
          clean_soil_area,
          lifting_oil_slush,
          excav_cont_soil,
          trans_cont_soil,
          refill_excav_soil,
        } = input;

        const upsertDoc = async (tx: any, url: string, type: string) => {
          const existingDoc = await tx
            .select()
            .from(workOrderSiteDocsTable)
            .where(
              and(
                eq(
                  workOrderSiteDocsTable.work_order_site_id,
                  work_order_site_id,
                ),
                eq(workOrderSiteDocsTable.type, type as any),
              ),
            );

          if (existingDoc.length > 0) {
            await tx
              .update(workOrderSiteDocsTable)
              .set({ document_url: url })
              .where(eq(workOrderSiteDocsTable.id, existingDoc[0]!.id));
          } else {
            await tx.insert(workOrderSiteDocsTable).values({
              work_order_site_id,
              type: type as any,
              document_url: url,
            });
          }
        };

        const upsertActivity = async (
          tx: any,
          table: any,
          data: SaveActivityData | undefined,
          activityName: string,
        ) => {
          if (!data) return;

          // Find the site_activity_id for this activity
          const sa = await tx
            .select()
            .from(siteActivityTable)
            .where(
              and(
                eq(siteActivityTable.work_order_site_id, work_order_site_id),
                eq(siteActivityTable.activity, activityName),
              ),
            );

          const siteActivityId = sa[0]?.id;

          const activityType =
            phase === "completion" ? "completion" : "estimate_sub-wo";

          const existing = await tx
            .select()
            .from(table)
            .where(
              and(
                eq(table.work_order_site_id, work_order_site_id),
                eq(table.type, activityType),
              ),
            );

          if (existing.length > 0) {
            await tx
              .update(table)
              .set({
                estimated_quantity: data.estimated_quantity,
                amount: data.amount,
                transportation_km: data.transportation_km,
                site_activity_id: siteActivityId,
              })
              .where(eq(table.id, existing[0]!.id));
          } else {
            await tx.insert(table).values({
              work_order_site_id,
              site_activity_id: siteActivityId,
              type: activityType,
              estimated_quantity: data.estimated_quantity,
              amount: data.amount,
              transportation_km: data.transportation_km,
            });
          }
        };

        try {
          await ctx.db.transaction(async (tx: any) => {
            if (document_url && phase !== "estimate_sub-wo") {
              await upsertDoc(tx, document_url, phase);
            }
            if (sub_wo_document_url) {
              await upsertDoc(tx, sub_wo_document_url, "sub_wo");
            }
            if (estimate_document_url) {
              await upsertDoc(tx, estimate_document_url, "estimate");
            }

            await upsertActivity(
              tx,
              cleaningUpSoilAreaTable,
              clean_soil_area,
              "clean_soil_area",
            );
            await upsertActivity(
              tx,
              liftingRecoveryOilSlushTable,
              lifting_oil_slush,
              "lifting_oily_slush_or_recovery_of_oil",
            );
            await upsertActivity(
              tx,
              excavationContSoilTable,
              excav_cont_soil,
              "excavation_oil_contaminated_soil",
            );
            await upsertActivity(
              tx,
              transportationContSoilTable,
              trans_cont_soil,
              "transportation_contaminated_soil",
            );
            await upsertActivity(
              tx,
              refillingExcavatedContSoilTable,
              refill_excav_soil,
              "refilling_excavated_oil_contaminated_soil_land",
            );

            if (phase === "completion") {
              await tx
                .update(workOrderSiteTable)
                .set({ is_completed: true })
                .where(eq(workOrderSiteTable.id, work_order_site_id));
            }
          });

          return {
            success: true,
            message: "Restoration phase data saved successfully",
          };
        } catch (error) {
          throw fromDatabaseError(error, "Saving restoration phase data");
        }
      }),
    ),
});

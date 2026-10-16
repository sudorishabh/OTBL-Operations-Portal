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
import {
  businessRule,
  fromDatabaseError,
  notFound,
  validationError,
} from "../../errors";
import { constants } from "@pkg/utils";
import { validators } from "@pkg/schema";
import {
  getSharePointConfig,
  isSharePointConfigured,
} from "../sharepoint/sharepoint.config";
import { createSharePointService } from "../sharepoint/sharepoint.service";
import { syncBioremediationCompletion } from "./bioremediation-completion";

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

const createSiteDocumentSchema = z.object({
  work_order_site_id: z.number().positive(),
  document_url: z.string().min(1).max(255),
  document_id: z.string().min(1).max(255).optional(),
  type: z.enum([
    "estimate",
    "completion",
    "measurement_sheet",
    "completion_certificate",
    "mobilization",
  ]),
});

const deleteSiteDocumentSchema = z.object({
  id: z.number().positive(),
});

const saveActivityDataSchema = z.object({
  estimated_quantity: z.string(),
  amount: z.string().optional(),
  transportation_km: z.string().optional(),
  oil_zapper_quantity: z.string().optional(),
});

type SaveActivityData = z.infer<typeof saveActivityDataSchema>;

const createBioSampleSchema = z.object({
  work_order_site_id: z.number().positive(),
  documents: validators.documentsValidator,
  tph_value: z.string(),
  application_month: z.string(),
});

const createOilZappingSchema = z.object({
  work_order_site_id: z.number().positive(),
  documents: validators.documentsValidator,
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

const {
  siteActivityTable,
  workOrderTable,
  workOrderSiteTable,
  workOrderSiteUserTable,
  userTable,
  workOrderSiteOperatorUploadTable,
  workOrderSiteDocsTable,
  bioremediationContSoilTable,
  bioSampleTable,
  bioOilZappingTable,
} = schema;

export const workOrderSiteMutationRouter = router({
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

        if (user_ids.length > 0) {
          const siteOperators = await ctx.db
            .select({ id: userTable.id })
            .from(userTable)
            .where(
              and(
                eq(userTable.role, constants.ROLES.SITE_OPERATOR),
                inArray(userTable.id, user_ids),
              ),
            );
          const allowed = new Set(siteOperators.map((r) => r.id));
          const invalid = user_ids.filter((id) => !allowed.has(id));
          if (invalid.length > 0) {
            throw validationError(
              `Users that are not Site Operators cannot be assigned: ${invalid.join(", ")}`,
              undefined,
              {
                userMessage:
                  "You can only assign Site Operators to a work-order site.",
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

  deleteMeasurementSheet: publicProcedure
    .input(
      z.object({
        id: z.number().positive(),
      }),
    )
    .mutation(
      handleMutation(async ({ input, ctx }) => {
        try {
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

  createSiteDocument: publicProcedure.input(createSiteDocumentSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      const { work_order_site_id, document_url, document_id, type } = input;

      // Estimate documents belong to an estimate, which restoration
      // doesn't have.
      if (type === "estimate") {
        const [woSite] = await ctx.db
          .select({ process_type: workOrderSiteTable.process_type })
          .from(workOrderSiteTable)
          .where(eq(workOrderSiteTable.id, work_order_site_id));

        if (woSite?.process_type === constants.WO_PROCESS.RESTORATION) {
          throw businessRule(
            "Restoration has no estimate, so it takes no estimate documents.",
          );
        }
      }

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

  deleteSiteDocument: publicProcedure.input(deleteSiteDocumentSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      try {
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

  saveContaminatedSoil: publicProcedure
    .input(
      z.object({
        work_order_site_id: z.number().positive(),
        phase: z.enum(["estimate", "completion", "estimate_sub-wo"]),
        document_url: z.string().optional(),
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
          if (estimate_document_url) {
            await upsertDoc(estimate_document_url, "estimate");
          }

          const activityType =
            phase === "completion" ? "completion" : "estimate_sub-wo";

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
          } else {
            // A new oil zapper plan can complete or reopen the site.
            await syncBioremediationCompletion(ctx.db, work_order_site_id);
          }

          return { success: true, message: "Contaminated Soil saved" };
        } catch (error) {
          throw fromDatabaseError(error, "Saving contaminated soil");
        }
      }),
    ),

  createBioSample: publicProcedure.input(createBioSampleSchema).mutation(
    handleMutation(async ({ input, ctx }) => {
      // A site takes one zero day sample, its baseline TPH.
      if (input.application_month === constants.ZERO_DAY_SAMPLE) {
        const [existing] = await ctx.db
          .select({ id: bioSampleTable.id })
          .from(bioSampleTable)
          .where(
            and(
              eq(bioSampleTable.work_order_site_id, input.work_order_site_id),
              eq(bioSampleTable.application_month, constants.ZERO_DAY_SAMPLE),
            ),
          )
          .limit(1);

        if (existing) {
          throw businessRule(
            "This site already has a zero day sample. Delete it to add a new one.",
          );
        }
      }

      try {
        const [result] = await ctx.db.insert(bioSampleTable).values({
          work_order_site_id: input.work_order_site_id,
          documents: input.documents,
          // Legacy single-document column, kept until it is dropped.
          tph_document_url: input.documents[0]!.url,
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
          documents: input.documents,
          // Legacy single-document column, kept until it is dropped.
          document_url: input.documents[0]!.url,
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

});

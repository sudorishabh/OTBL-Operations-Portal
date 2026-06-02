import { z } from "zod";
import {
  positiveIntValidator,
  nonNegativeNumberValidator,
} from "../validators";

export const activityPhaseEnum = z.enum(["sub_wo", "estimate", "completion"]);

export const activityTypeEnum = z.enum([
  "clean_soil_area",
  "lifting_oily_slush_or_recovery_of_oil",
  "excavation_oil_contaminated_soil",
  "transportation_contaminated_soil",
  "refilling_excavated_oil_contaminated_soil_land",
  "bioremediation_oil_contaminated_soil",
]);

export const getWorkOrderSiteDetailsSchema = z.object({
  work_order_site_id: positiveIntValidator,
});

export const getSiteActivitiesSchema = z.object({
  work_order_site_id: positiveIntValidator,
});

export const createSiteActivitySchema = z.object({
  work_order_site_id: positiveIntValidator,
  activity: z.string().min(1, "Activity name is required").max(255),
});

export const updateSiteActivitySchema = z.object({
  id: positiveIntValidator,
  activity: z.string().min(1, "Activity name is required").max(255).optional(),
});

export const deleteSiteActivitySchema = z.object({
  id: positiveIntValidator,
});

export const activityDataBaseSchema = z.object({
  site_activity_id: positiveIntValidator.optional(),
  work_order_site_id: positiveIntValidator,
  estimated_quantity: nonNegativeNumberValidator,
  amount: nonNegativeNumberValidator.optional(),
  transportation_km: nonNegativeNumberValidator.optional(),
  type: activityPhaseEnum,
});

export const createActivityDataSchema = z.object({
  activity_table: z.enum([
    "clean_soil_area",
    "lifting_oil_slush",
    "excav_cont_soil",
    "trans_cont_soil",
    "refill_excav_soil",
    "biorem_cont_soil",
  ]),
  data: activityDataBaseSchema,
});

export const updateActivityDataSchema = z.object({
  id: positiveIntValidator,
  activity_table: z.enum([
    "clean_soil_area",
    "lifting_oil_slush",
    "excav_cont_soil",
    "trans_cont_soil",
    "refill_excav_soil",
    "biorem_cont_soil",
  ]),
  data: activityDataBaseSchema.partial(),
});

export const deleteActivityDataSchema = z.object({
  id: positiveIntValidator,
  activity_table: z.enum([
    "clean_soil_area",
    "lifting_oil_slush",
    "excav_cont_soil",
    "trans_cont_soil",
    "refill_excav_soil",
    "biorem_cont_soil",
  ]),
});

export const getActivityDataSchema = z.object({
  work_order_site_id: positiveIntValidator,
  site_activity_id: positiveIntValidator.optional(),
  activity_table: z.enum([
    "clean_soil_area",
    "lifting_oil_slush",
    "excav_cont_soil",
    "trans_cont_soil",
    "refill_excav_soil",
    "biorem_cont_soil",
  ]),
  phase: activityPhaseEnum.optional(),
});

export type ActivityPhase = z.infer<typeof activityPhaseEnum>;
export type ActivityType = z.infer<typeof activityTypeEnum>;
export type CreateSiteActivityInput = z.infer<typeof createSiteActivitySchema>;
export type UpdateSiteActivityInput = z.infer<typeof updateSiteActivitySchema>;
export type CreateActivityDataInput = z.infer<typeof createActivityDataSchema>;
export type UpdateActivityDataInput = z.infer<typeof updateActivityDataSchema>;
export type GetActivityDataInput = z.infer<typeof getActivityDataSchema>;

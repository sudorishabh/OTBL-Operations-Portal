import { z } from "zod";
import {
  titleValidator,
  codeValidator,
  agreementNumberValidator,
  documentKeyValidator,
  positiveIntValidator,
  longDescriptionValidator,
  searchQueryValidator,
  dateValidator,
} from "../validators";
import { createSiteSchema } from "../site/site.schema";

export const activityTypeEnum = z.enum(["insitu", "exsitu"]);

export const workOrderStatusEnum = z.enum([
  "pending",
  "completed",
  "cancelled",
]);

export const processTypeEnum = z.enum([
  "bioremediation",
  "restoration",
  "bioremediation_restoration",
]);

export const woActivityNameEnum = z.enum([
  "clean_soil_area",
  "lifting_oily_slush_or_recovery_of_oil",
  "excavation_oil_contaminated_soil",
  "transportation_contaminated_soil",
  "refilling_excavated_oil_contaminated_soil_land",
  "bioremediation_oil_contaminated_soil",
]);

export const woActivitySchema = z.object({
  name: woActivityNameEnum,
  unit: z.string(),
});

export const woActivitySchemaWithId = woActivitySchema.extend({
  schedule_of_rate_id: positiveIntValidator,
});

export const scheduleOfRateSchema = z.object({
  activity: woActivitySchema,
  unit: z
    .string()
    .min(1, "Unit is required")
    .max(10, "Unit cannot exceed 10 characters"),
  estimated_quantity: z.number().gt(0, "Quantity must be greater than zero"),
  rc_unit_rate: z.number().gt(0, "Rate must be greater than zero"),
  gst_percentage: z.number().min(1, "Min 1%"),
  unit_rate_inc_gst: z.number().min(0, "Rate cannot be negative"),
  total_cost: z.number().min(0, "Total cost cannot be negative"),
  transportation_km: z
    .number()
    .min(0, "Distance cannot be negative")
    .optional(),
});

export const baseWorkOrderSchema = z.object({
  code: codeValidator,
  agreement_number: agreementNumberValidator,
  rate_contract_number: z
    .string({ message: "Rate contract number is required" })
    .trim()
    .min(1, "Rate contract number is required")
    .max(255, "Rate contract number cannot exceed 255 characters"),
  title: titleValidator,
  start_date: dateValidator,
  end_date: dateValidator,
  handing_over_date: dateValidator,
  document_key: documentKeyValidator,
  process_type: processTypeEnum,
  description: longDescriptionValidator,
  schedule_of_rates: z
    .array(scheduleOfRateSchema)
    .min(1, "At least one schedule of rate entry is required"),
});

export const createWorkOrderSchema = baseWorkOrderSchema.extend({
  proposal_id: positiveIntValidator,
  client_id: positiveIntValidator,
});

export const updateWorkOrderSchema = baseWorkOrderSchema
  .partial()
  .extend({
    id: positiveIntValidator,
    status: workOrderStatusEnum.optional(),
    cancellation_reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return data.end_date >= data.start_date;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["end_date"],
    },
  );

export const approveWorkOrderSchema = z.object({
  id: positiveIntValidator,
});

export const cancelWorkOrderSchema = z.object({
  id: positiveIntValidator,
  cancellation_reason: z
    .string({ message: "A cancellation reason is required" })
    .trim()
    .min(1, "A cancellation reason is required")
    .max(1000, "Cancellation reason cannot exceed 1000 characters"),
});

export const deleteWorkOrderSchema = z.object({
  id: positiveIntValidator,
});

export const getWorkOrdersByClientSchema = z.object({
  client_id: positiveIntValidator,
});

export const getWorkOrdersByOfficeSchema = z.object({
  office_id: positiveIntValidator,
});

export const getWorkOrderSchema = z.object({
  id: positiveIntValidator,
  limit: z.number().min(1).max(100).default(10),
  page: z.number().min(1).default(1),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_order: z.string().optional(),
});

export const getAllWorkOrdersPaginatedSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  searchQuery: z.string().optional(),
  status: z.string().optional(),
  office_id: z.number().optional(),
  workOrderOrder: z.enum(["asc", "desc", "latest", "oldest"]).optional(),
});

export const createWorkOrderSiteSchema = z.object({
  work_order_id: positiveIntValidator,
  client_id: positiveIntValidator,
  site_id: positiveIntValidator.optional(),
  date: dateValidator,
  end_date: dateValidator,
  process_type: z.string().min(1, "Process type is required"),
  job_number: z.string().min(1, "Job number is required"),
  area: z.string().min(1, "Area is required"),
  installation_type: z.string().min(1, "Installation type is required"),
  joint_estimate_number: z.string().min(1, "Joint estimate number is required"),
  land_owner_name: z.string().min(1, "Land owner name is required"),
  remarks: z.string().optional(),
  selected_activities: z.array(woActivitySchemaWithId).optional(),
  new_site: createSiteSchema.optional(),
});

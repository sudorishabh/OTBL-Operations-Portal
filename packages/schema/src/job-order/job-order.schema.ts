import { z } from "zod";
import { constants } from "@pkg/utils";
import {
  dateValidator,
  longDescriptionValidator,
  optionalDocumentsValidator,
  positiveIntValidator,
} from "../validators";

const { JOB_ORDER_ACTIVITIES } = constants;

type JobOrderActivityKey = (typeof JOB_ORDER_ACTIVITIES)[number]["key"];
const activityKeys = JOB_ORDER_ACTIVITIES.map((activity) => activity.key) as [
  JobOrderActivityKey,
  ...JobOrderActivityKey[],
];

const requiredText = (label: string) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(255, `${label} cannot exceed 255 characters`);

const optionalText = (label: string) =>
  z
    .string()
    .trim()
    .max(255, `${label} cannot exceed 255 characters`)
    .optional();

// A row of the form's activity table. The quantity is written as on the form,
// so it can be a measurement, yes, no or "To be assessed later".
export const jobOrderActivitySchema = z.object({
  key: z.enum(activityKeys),
  quantity: z.string().trim().max(255, "Quantity cannot exceed 255 characters"),
  completion_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid completion date")
    .nullable(),
});

export const baseJobOrderSchema = z
  .object({
    jo_number: z
      .string({ message: "Job order number is required" })
      .trim()
      .min(1, "Job order number is required")
      .max(255, "Job order number cannot exceed 255 characters"),
    title: z
      .string({ message: "Title is required" })
      .trim()
      .min(1, "Title is required")
      .max(255, "Title cannot exceed 255 characters"),
    start_date: dateValidator,
    end_date: dateValidator,
    description: longDescriptionValidator,
    // The client's job order form, as the installation manager issues it.
    issued_by: optionalText("Issuing office"),
    rc_noa_number: optionalText("RC NOA number"),
    rc_noa_date: dateValidator.nullable().optional(),
    ola_number: optionalText("OLA number"),
    po_number: optionalText("PO number"),
    installation_name: requiredText("Installation name"),
    location: requiredText("Location of the job"),
    mobilization_date: dateValidator.nullable().optional(),
    activities: z
      .array(jobOrderActivitySchema)
      .max(JOB_ORDER_ACTIVITIES.length)
      .optional(),
    contractor_ids: z
      .array(positiveIntValidator)
      .min(1, "Choose at least one vendor"),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "End date must be on or after the start date",
    path: ["end_date"],
  });

export const createJobOrderSchema = z.intersection(
  baseJobOrderSchema,
  z.object({
    // The work order's restoration row.
    work_order_site_id: positiveIntValidator,
  }),
);

export const updateJobOrderSchema = z.intersection(
  baseJobOrderSchema,
  z.object({ id: positiveIntValidator }),
);

export const jobOrderIdSchema = z.object({
  id: positiveIntValidator,
});

// The job order's completion certificates, replacing those saved before.
export const setJobOrderCertificatesSchema = z.object({
  id: positiveIntValidator,
  documents: optionalDocumentsValidator,
});

export const getJobOrdersSchema = z.object({
  work_order_site_id: positiveIntValidator,
});

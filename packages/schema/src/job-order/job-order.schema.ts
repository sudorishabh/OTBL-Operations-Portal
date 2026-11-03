import { z } from "zod";
import {
  dateValidator,
  longDescriptionValidator,
  optionalDocumentsValidator,
  positiveIntValidator,
} from "../validators";

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

import z from "zod";
import {
  optionalEmailValidator,
  optionalGstNumberValidator,
  optionalContactNumberValidator,
  positiveIntValidator,
} from "../validators";
import { constants } from "@pkg/utils";

const { STATUS } = constants;

// Vendors are stored in the contractors table: everyone material and work
// are ordered from, through purchase orders, sub-contracts and job orders.
// They're shared by every office.

const optionalPanNumberValidator = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (val) => !val || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val),
    "Please enter a valid PAN (e.g., ABCDE1234F)",
  )
  .optional()
  .or(z.literal(""));

const vendorFields = {
  // Kept as typed, as company names carry their own capitals.
  name: z
    .string({ message: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(255, "Name cannot exceed 255 characters"),
  contact_number: optionalContactNumberValidator,
  email: optionalEmailValidator,
  address: z
    .string()
    .trim()
    .max(500, "Address cannot exceed 500 characters")
    .optional(),
  gst_number: optionalGstNumberValidator,
  pan_number: optionalPanNumberValidator,
};

export const vendorStatusEnum = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);

export const createVendorSchema = z.object(vendorFields);

// Fields left out keep their value.
export const updateVendorSchema = z
  .object(vendorFields)
  .partial()
  .extend({
    id: positiveIntValidator,
    status: vendorStatusEnum.optional(),
  });

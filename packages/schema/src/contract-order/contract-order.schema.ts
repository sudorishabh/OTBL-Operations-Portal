import { z } from "zod";
import { constants } from "@pkg/utils";
import {
  dateValidator,
  optionalDocumentsValidator,
  longDescriptionValidator,
  positiveIntValidator,
} from "../validators";

const { CONTRACT_ORDER_TYPE, CONTRACT_ORDER_ITEMS } = constants;

export const contractOrderTypeEnum = z.enum([
  CONTRACT_ORDER_TYPE.PURCHASE_ORDER,
  CONTRACT_ORDER_TYPE.SUB_CONTRACT,
]);

const itemKeys = CONTRACT_ORDER_ITEMS.map((item) => item.key) as [
  string,
  ...string[],
];
export const contractOrderItemEnum = z.enum(itemKeys);

// What the order requires at one of its sites. "Other" items say what they are.
// An edit names the items it keeps by id, as expenses point at them.
export const contractOrderItemSchema = z
  .object({
    id: positiveIntValidator.optional(),
    work_order_site_id: positiveIntValidator,
    item: contractOrderItemEnum,
    description: z
      .string()
      .trim()
      .max(255, "Description cannot exceed 255 characters")
      .optional(),
    quantity: z.number().gt(0, "Quantity must be greater than zero"),
  })
  .refine((data) => data.item !== "other" || !!data.description, {
    message: "Describe the item",
    path: ["description"],
  });

export const baseContractOrderSchema = z.object({
  type: contractOrderTypeEnum,
  order_number: z
    .string({ message: "Order number is required" })
    .trim()
    .min(1, "Order number is required")
    .max(255, "Order number cannot exceed 255 characters"),
  order_date: dateValidator,
  description: longDescriptionValidator,
  // The order's own paperwork, if uploaded.
  documents: optionalDocumentsValidator,
  contractor_ids: z
    .array(positiveIntValidator)
    .min(1, "Choose at least one vendor"),
  items: z
    .array(contractOrderItemSchema)
    .min(1, "Add what the order requires at one or more sites"),
});

export const createContractOrderSchema = baseContractOrderSchema.extend({
  work_order_id: positiveIntValidator,
});

export const updateContractOrderSchema = baseContractOrderSchema.extend({
  id: positiveIntValidator,
});

export const contractOrderIdSchema = z.object({
  id: positiveIntValidator,
});

export const getContractOrdersSchema = z.object({
  work_order_id: positiveIntValidator,
});

export const getSiteContractOrderItemsSchema = z.object({
  work_order_site_id: positiveIntValidator,
});

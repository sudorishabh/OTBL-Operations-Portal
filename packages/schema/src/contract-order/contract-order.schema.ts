import { z } from "zod";
import { constants } from "@pkg/utils";
import {
  dateValidator,
  optionalDocumentsValidator,
  longDescriptionValidator,
  positiveIntValidator,
} from "../validators";

const { CONTRACT_ORDER_TYPE, CONTRACT_ORDER_ITEMS, OIL_ZAPPER } = constants;

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

const orderFields = z.object({
  type: contractOrderTypeEnum,
  order_number: z
    .string({ message: "Order number is required" })
    .trim()
    .min(1, "Order number is required")
    .max(255, "Order number cannot exceed 255 characters"),
  order_date: dateValidator,
  description: longDescriptionValidator,
  // The order's own paperwork, and its completion documents, uploaded once
  // the work is done.
  documents: optionalDocumentsValidator,
  completion_documents: optionalDocumentsValidator.optional(),
  contractor_ids: z
    .array(positiveIntValidator)
    .min(1, "Choose at least one vendor"),
  items: z
    .array(contractOrderItemSchema)
    .min(1, "Add what the order requires at one or more sites"),
  // A purchase order's cost: its rate per unit of oil zapper before GST, the
  // GST on it, and the vendor's invoice. Sub-contracts are costed at the site.
  unit_rate: z
    .number()
    .gt(0, "The rate must be greater than zero")
    .nullable()
    .optional(),
  gst_percentage: z
    .number()
    .min(0, "GST can't be negative")
    .max(100, "GST can't exceed 100%")
    .nullable()
    .optional(),
  invoice_number: z
    .string()
    .trim()
    .max(100, "Invoice number cannot exceed 100 characters")
    .optional(),
});

// What each kind of order may hold. A purchase order buys oil zapper from one
// vendor, once per site, at its rate. A sub-contract gives out the rest at one
// site.
const checkOrderRules = (
  order: z.infer<typeof orderFields>,
  ctx: z.RefinementCtx,
) => {
  const isPurchase = order.type === CONTRACT_ORDER_TYPE.PURCHASE_ORDER;
  const allowedItems = new Set<string>(
    CONTRACT_ORDER_ITEMS.filter((item) => item.orderType === order.type).map(
      (item) => item.key,
    ),
  );
  order.items.forEach((item, index) => {
    if (!allowedItems.has(item.item)) {
      ctx.addIssue({
        code: "custom",
        path: ["items", index, "item"],
        message: isPurchase
          ? "A purchase order only buys oil zapper. Give other items out through a sub-contract."
          : "Oil zapper is bought through a purchase order, not a sub-contract.",
      });
    }
  });

  const siteIds = order.items.map((item) => item.work_order_site_id);
  if (isPurchase) {
    if (new Set(order.contractor_ids).size !== 1) {
      ctx.addIssue({
        code: "custom",
        path: ["contractor_ids"],
        message: "A purchase order is given to one vendor",
      });
    }
    if (new Set(siteIds).size !== siteIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Give each site's oil zapper on one row",
      });
    }
    if (!order.unit_rate) {
      ctx.addIssue({
        code: "custom",
        path: ["unit_rate"],
        message: `Enter the rate per ${OIL_ZAPPER.UNIT} of oil zapper`,
      });
    }
  } else if (new Set(siteIds).size > 1) {
    ctx.addIssue({
      code: "custom",
      path: ["items"],
      message: "A sub-contract is for one site",
    });
  }
};

export const baseContractOrderSchema = orderFields.superRefine(checkOrderRules);

export const createContractOrderSchema = orderFields
  .extend({ work_order_id: positiveIntValidator })
  .superRefine(checkOrderRules);

export const updateContractOrderSchema = orderFields
  .extend({ id: positiveIntValidator })
  .superRefine(checkOrderRules);

// The order's completion documents, replacing those saved before. They can be
// uploaded any time after the order is given out.
export const setCompletionDocumentsSchema = z.object({
  id: positiveIntValidator,
  completion_documents: optionalDocumentsValidator,
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

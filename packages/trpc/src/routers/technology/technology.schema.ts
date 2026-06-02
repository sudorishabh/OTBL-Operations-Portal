import { z } from "zod";
import { positiveIntValidator } from "../../validation/validators";

export const getTechnologiesSchema = z
  .object({
    status: z.enum(["active", "inactive", "all"]).optional().default("active"),
  })
  .optional();

export const getActivityTypesByTechnologySchema = z.object({
  technology_id: positiveIntValidator,
});

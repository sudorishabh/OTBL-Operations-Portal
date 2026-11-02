import { z } from "zod";

import * as jobOrderSchemas from "./job-order.schema";

export type JobOrderInput = z.input<typeof jobOrderSchemas.baseJobOrderSchema>;

export type CreateJobOrderInput = z.output<
  typeof jobOrderSchemas.createJobOrderSchema
>;

export type UpdateJobOrderInput = z.output<
  typeof jobOrderSchemas.updateJobOrderSchema
>;

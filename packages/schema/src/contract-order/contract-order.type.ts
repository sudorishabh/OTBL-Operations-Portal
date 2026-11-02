import { z } from "zod";

import * as contractOrderSchemas from "./contract-order.schema";

export type ContractOrderInput = z.input<
  typeof contractOrderSchemas.baseContractOrderSchema
>;

export type ContractOrderItemInput = z.input<
  typeof contractOrderSchemas.contractOrderItemSchema
>;

export type CreateContractOrderInput = z.output<
  typeof contractOrderSchemas.createContractOrderSchema
>;

export type UpdateContractOrderInput = z.output<
  typeof contractOrderSchemas.updateContractOrderSchema
>;

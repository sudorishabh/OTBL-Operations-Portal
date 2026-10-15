import { z } from "zod";

import * as vendorSchemas from "./vendor.schema";

export type createVendorInput = z.infer<typeof vendorSchemas.createVendorSchema>;

export type updateVendorInput = z.infer<typeof vendorSchemas.updateVendorSchema>;

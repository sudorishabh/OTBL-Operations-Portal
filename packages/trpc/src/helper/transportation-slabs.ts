import { schema } from "@pkg/db";
import { constants } from "@pkg/utils";

// A schedule of rates row's transportation slabs as they are saved now, each
// with its quantity and rate. Slabs saved before each had its own rate hold
// just the quantity; they read as that quantity at a rate of 0, until the
// schedule of rates is next edited.
export const readTransportationSlabs = (
  saved: unknown,
): schema.TransportationSlabsRow | null => {
  if (!saved || typeof saved !== "object") return null;
  const slabs = saved as Record<string, unknown>;

  return Object.fromEntries(
    constants.TRANSPORT_SLABS.map((slab) => {
      const value = slabs[slab.key];
      if (value !== null && typeof value === "object") {
        const { quantity, rate } = value as {
          quantity?: unknown;
          rate?: unknown;
        };
        return [
          slab.key,
          { quantity: Number(quantity) || 0, rate: Number(rate) || 0 },
        ];
      }
      return [slab.key, { quantity: Number(value) || 0, rate: 0 }];
    }),
  ) as schema.TransportationSlabsRow;
};

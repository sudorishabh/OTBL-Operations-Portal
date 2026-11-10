import type { RouterOutputs } from "@/lib/trpc";

// What an office's page shows, as getOffice sends it.
export type OfficeDetails = RouterOutputs["officeQuery"]["getOffice"];

export type OfficeMember = OfficeDetails["operators"][number];

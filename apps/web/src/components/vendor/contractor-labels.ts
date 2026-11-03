import { constants } from "@pkg/utils";

const { CONTRACTOR_TYPE } = constants;

export type ContractorType =
  (typeof CONTRACTOR_TYPE)[keyof typeof CONTRACTOR_TYPE];

// How the vendors and sub-contractors pages name what they list.
export const CONTRACTOR_LABELS: Record<
  ContractorType,
  {
    one: string;
    many: string;
    description: string;
    // The dashboard route of the type's page.
    path: string;
  }
> = {
  [CONTRACTOR_TYPE.VENDOR]: {
    one: "Vendor",
    many: "Vendors",
    description: "Suppliers material is bought from, through purchase orders.",
    path: "/dashboard/vendor",
  },
  [CONTRACTOR_TYPE.SUB_CONTRACTOR]: {
    one: "Sub-contractor",
    many: "Sub-contractors",
    description: "Contractors work is subcontracted to, through work and job orders.",
    path: "/dashboard/sub-contractor",
  },
};

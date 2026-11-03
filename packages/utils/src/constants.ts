export const ROLES = {
  ADMIN: "admin",
  MANAGER: "office_manager",
  OFFICE_OPERATOR: "office_operator",
  SITE_OPERATOR: "site_operator",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 4,
  office_manager: 3,
  office_operator: 2,
  site_operator: 2,
  viewer: 1,
};

export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export const WO_PROCESS = {
  BIOREMEDIATION: "bioremediation",
  RESTORATION: "restoration",
  BIOREMEDIATION_RESTORATION: "bioremediation_restoration",
} as const;

export const processTypeOptions = [
  { value: WO_PROCESS.BIOREMEDIATION, label: "Bioremediation" },
  { value: WO_PROCESS.RESTORATION, label: "Restoration" },
  {
    value: WO_PROCESS.BIOREMEDIATION_RESTORATION,
    label: "Bioremediation & Restoration (Both)",
  },
];

export const WO_ACTIVITIES = {
  clean_soil_area: "clean_soil_area",
  LIFTING_OILY_SLUSH_OR_RECOVERY_OF_OIL:
    "lifting_oily_slush_or_recovery_of_oil",
  EXCAVATION_OIL_CONTAMINATED_SOIL: "excavation_oil_contaminated_soil",
  TRANSPORTATION_CONTAMINATED_SOIL: "transportation_contaminated_soil",
  REFILLING_EXCAVATED_OIL_CONTAMINATED_SOIL_LAND:
    "refilling_excavated_oil_contaminated_soil_land",
  BIOREMEDIATION_OIL_CONTAMINATED_SOIL: "bioremediation_oil_contaminated_soil",
} as const;

export const ACTIVITY_TYPE = {
  INSITU: "insitu",
  EXSITU: "exsitu",
} as const;

export const ACTIVITY_PHASE = {
  WORK_ESTIMATE: "work_estimate",
  ORDER: "order",
  COMPLETION: "completion",
} as const;

export const PROPOSAL_STATUS = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
} as const;

export const WORK_ORDER_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const ACTIVITY_ITEM_TABLES = {
  CLEAN_SOIL_AREA: "clean_soil_area",
  LIFTING_OIL_SLUSH: "lifting_oil_slush",
  EXCAV_CONT_SOIL: "excav_cont_soil",
  TRANS_CONT_SOIL: "trans_cont_soil",
  REFILL_EXCAV_SOIL: "refill_excav_soil",
  BIOREM_CONT_SOIL: "biorem_cont_soil",
  BIO_SAMPLES: "bio_samples",
  BIO_OIL_ZAPPING: "bio_oil_zapping",
} as const;

export const WO_UNITS = {
  M_SQUARE: "m²",
  M_CUBE: "m³",
  MT: "MT",
  KM_M_CUBE: "km/m³",
} as const;

export const unitOptions = [
  { value: WO_UNITS.M_SQUARE, label: "m² (Square Meter)" },
  { value: WO_UNITS.M_CUBE, label: "m³ (Cubic Meter)" },
  { value: WO_UNITS.MT, label: "MT (Metric Ton)" },
  { value: WO_UNITS.KM_M_CUBE, label: "km/m³ (Per km per Cubic Meter)" },
];

// Distance slabs a transportation SOR quantity is split into; their sum is
// the activity's estimated quantity.
export const TRANSPORT_SLABS = [
  { key: "up_to_5_km", label: "Up to 5 KM" },
  { key: "over_20_km", label: "More than 20 KM" },
  { key: "over_40_km", label: "More than 40 KM (additional per km)" },
] as const;

// The rows of the client's job order form and its work completion
// certificate, worded as on each, with the schedule of rates activity each is
// billed under. A row with no unit is answered yes or no, and transportation
// is given per distance in the rows under it.
export const JOB_ORDER_ACTIVITIES = [
  {
    key: "spill_cleaning",
    sorActivity: WO_ACTIVITIES.clean_soil_area,
    label:
      "Cleaning up of Spill Area upto 5 cm depth: Collection of floating free oil/slush from spill area (land/water body)",
    unit: "Sq. Meter",
    completionLabel:
      "Cleaning up of Spill Area upto 5 cm depth: Collection of floating free oil/slush from spill area (land/water body)",
    completionUnit: "Sq. Meter",
    indent: false,
  },
  {
    key: "oily_slush_lifting",
    sorActivity: WO_ACTIVITIES.LIFTING_OILY_SLUSH_OR_RECOVERY_OF_OIL,
    label: "Lifting of Oily Slush or Recovery of Oil or Slush",
    unit: "Cub. Meter",
    completionLabel: "Lifting of Oily Slush or Recovery of Oil",
    completionUnit: "Cub. Meter",
    indent: false,
  },
  {
    key: "excavation",
    sorActivity: WO_ACTIVITIES.EXCAVATION_OIL_CONTAMINATED_SOIL,
    label: "Excavation of Oil Contaminated Soil",
    unit: "Cub. Meter",
    completionLabel: "Excavation of Oil Contaminated Soil",
    completionUnit: "Cub. Meter",
    indent: false,
  },
  {
    key: "transportation",
    sorActivity: WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL,
    label: "Transportation of Oil Contaminated Soil/Floating Oil/Oily Sludge",
    unit: "",
    completionLabel: "Transportation of Oil Contaminated Soil",
    completionUnit: "",
    indent: false,
  },
  {
    key: "transportation_up_to_5_km",
    sorActivity: WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL,
    label: "Up to 5 km",
    unit: "Cub. Meter",
    completionLabel: "Up to 5 km",
    completionUnit: "Cub. Meter",
    indent: true,
  },
  {
    key: "transportation_6_to_20_km",
    sorActivity: WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL,
    label: "6-20 km",
    unit: "Cub. Meter",
    completionLabel: "6-20 km",
    completionUnit: "Cub. Meter",
    indent: true,
  },
  {
    key: "refilling",
    sorActivity: WO_ACTIVITIES.REFILLING_EXCAVATED_OIL_CONTAMINATED_SOIL_LAND,
    label:
      "Re-filling of Excavation/Land/Dressing of Cleaning Surface by good soil",
    unit: "",
    completionLabel:
      "Re-filling of Excavated Oil Contaminated Soil land with Fresh Native Soil",
    completionUnit: "Cub. Meter",
    indent: false,
  },
  {
    key: "bioremediation_volume",
    sorActivity: WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL,
    label:
      "Bio-remediation of Oil Contaminated Soil at designated Bio-remediation site (Vol=L*B*H)",
    unit: "Cub. Meter",
    completionLabel:
      "Bio-remediation of Oil Contaminated Soil at designated Bio-remediation site (Vol=L*B*H)",
    completionUnit: "Cub. Meter",
    indent: false,
  },
  {
    key: "bioremediation_weight",
    sorActivity: WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL,
    label:
      "Bio-remediation of Oil Contaminated Soil at designated Bio-remediation site (MT=Vol*Density) Note: For estimation",
    unit: "Metric Ton",
    completionLabel:
      "Bio-remediation of Oil Contaminated Soil at designated Bio-remediation site (MT=Vol*Density) Note: Density as per lab test report.",
    completionUnit: "Metric Ton",
    indent: false,
  },
] as const;

// The bio sample taken at mobilization, before the first application. It is
// stored as the bio sample whose application month is this label.
export const ZERO_DAY_SAMPLE = "Zero Day";

// The oil zapper applied at a bioremediation site. Its planned quantity is set
// with the site's estimate, and expenses are logged against it like an
// activity.
export const OIL_ZAPPER = {
  KEY: "oil_zapper",
  LABEL: "Oil Zapper",
  UNIT: "kg",
} as const;

// Who work is given to: a vendor supplies material, and a sub-contractor
// carries out a service. Each has its own page.
export const CONTRACTOR_TYPE = {
  VENDOR: "vendor",
  SUB_CONTRACTOR: "sub_contractor",
} as const;

export const contractorTypeOptions = [
  { value: CONTRACTOR_TYPE.VENDOR, label: "Vendor" },
  { value: CONTRACTOR_TYPE.SUB_CONTRACTOR, label: "Sub-contractor" },
] as const;

// The two kinds of order bioremediation work is given out through: a purchase
// order buys material, and a work order subcontracts a service.
export const CONTRACT_ORDER_TYPE = {
  PURCHASE_ORDER: "purchase_order",
  WORK_ORDER: "work_order",
} as const;

export const contractOrderTypeOptions = [
  { value: CONTRACT_ORDER_TYPE.PURCHASE_ORDER, label: "Purchase Order" },
  { value: CONTRACT_ORDER_TYPE.WORK_ORDER, label: "Work Order (Subcontract)" },
] as const;

// What a contract order can require at a site. Oil zapper bought through a
// purchase order is the site's procured oil zapper.
export const CONTRACT_ORDER_ITEMS = [
  { key: OIL_ZAPPER.KEY, label: OIL_ZAPPER.LABEL, unit: OIL_ZAPPER.UNIT },
  { key: "jcb", label: "JCB", unit: "hours" },
  { key: "labour", label: "Labour", unit: "man-days" },
  { key: "transport", label: "Transport", unit: "trips" },
  { key: "other", label: "Other", unit: "Nos" },
] as const;

// A bioremediation site's treatment is achieved once a bio sample's TPH drops
// below this target; its share of the schedule of rates is then used.
export const TPH_TARGET = 0.5;

export const GST_PERCENTAGE = 18;

// Most documents a user can upload at once, or attach to one record.
export const MAX_DOCUMENTS = 10;

// Every document upload is PDF only.
export const DOCUMENT_EXTENSIONS = [".pdf"];

// The one exception: site photos taken with the operator page camera.
export const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// Every activity is billed in one fixed unit.
export const allActivityOptions = [
  {
    value: WO_ACTIVITIES.clean_soil_area,
    label: "Cleaning Up Soil Area",
    unit: WO_UNITS.M_SQUARE,
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.LIFTING_OILY_SLUSH_OR_RECOVERY_OF_OIL,
    label: "Lifting Oily Slush / Recovery of Oil",
    unit: WO_UNITS.M_CUBE,
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.EXCAVATION_OIL_CONTAMINATED_SOIL,
    label: "Excavation Oil Contaminated Soil",
    unit: WO_UNITS.M_CUBE,
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL,
    label: "Transportation Contaminated Soil",
    unit: WO_UNITS.KM_M_CUBE,
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.REFILLING_EXCAVATED_OIL_CONTAMINATED_SOIL_LAND,
    label: "Refilling Excavated Oil Contaminated Soil Land",
    unit: WO_UNITS.M_CUBE,
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL,
    label: "Bioremediation Oil Contaminated Soil",
    unit: WO_UNITS.MT,
    isBioremediation: true,
  },
];

export type Status = (typeof STATUS)[keyof typeof STATUS];

export default {
  ROLES,
  STATUS,
  ROLE_HIERARCHY,
  WO_PROCESS,
  WO_ACTIVITIES,
  WO_UNITS,
  GST_PERCENTAGE,
  MAX_DOCUMENTS,
  DOCUMENT_EXTENSIONS,
  PHOTO_EXTENSIONS,
  processTypeOptions,
  unitOptions,
  TRANSPORT_SLABS,
  JOB_ORDER_ACTIVITIES,
  ZERO_DAY_SAMPLE,
  OIL_ZAPPER,
  TPH_TARGET,
  CONTRACTOR_TYPE,
  contractorTypeOptions,
  CONTRACT_ORDER_TYPE,
  contractOrderTypeOptions,
  CONTRACT_ORDER_ITEMS,
  allActivityOptions,
  ACTIVITY_TYPE,
  ACTIVITY_PHASE,
  PROPOSAL_STATUS,
  WORK_ORDER_STATUS,
  ACTIVITY_ITEM_TABLES,
};

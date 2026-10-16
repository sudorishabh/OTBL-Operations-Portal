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

// The bio sample taken at mobilization, before the first application. It is
// stored as the bio sample whose application month is this label.
export const ZERO_DAY_SAMPLE = "Zero Day";

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
  ZERO_DAY_SAMPLE,
  allActivityOptions,
  ACTIVITY_TYPE,
  ACTIVITY_PHASE,
  PROPOSAL_STATUS,
  WORK_ORDER_STATUS,
  ACTIVITY_ITEM_TABLES,
};

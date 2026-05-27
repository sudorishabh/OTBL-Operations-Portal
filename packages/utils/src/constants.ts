export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  OPERATOR: "operator",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 4,
  manager: 3,
  operator: 2,
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
} as const;

export const unitOptions = [
  { value: WO_UNITS.M_SQUARE, label: "m² (Square Meter)" },
  { value: WO_UNITS.M_CUBE, label: "m³ (Cubic Meter)" },
  { value: WO_UNITS.MT, label: "MT (Metric Ton)" },
];

export const GST_PERCENTAGE = 18;

export const allActivityOptions = [
  {
    value: WO_ACTIVITIES.clean_soil_area,
    label: "Cleaning Up Soil Area",
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.LIFTING_OILY_SLUSH_OR_RECOVERY_OF_OIL,
    label: "Lifting Oily Slush / Recovery of Oil",
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.EXCAVATION_OIL_CONTAMINATED_SOIL,
    label: "Excavation Oil Contaminated Soil",
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.TRANSPORTATION_CONTAMINATED_SOIL,
    label: "Transportation Contaminated Soil",
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.REFILLING_EXCAVATED_OIL_CONTAMINATED_SOIL_LAND,
    label: "Refilling Excavated Oil Contaminated Soil Land",
    isBioremediation: false,
  },
  {
    value: WO_ACTIVITIES.BIOREMEDIATION_OIL_CONTAMINATED_SOIL,
    label: "Bioremediation Oil Contaminated Soil",
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
  processTypeOptions,
  unitOptions,
  allActivityOptions,
  ACTIVITY_TYPE,
  ACTIVITY_PHASE,
  PROPOSAL_STATUS,
  WORK_ORDER_STATUS,
  ACTIVITY_ITEM_TABLES,
};

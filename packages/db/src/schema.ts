import {
  mysqlTable,
  timestamp,
  varchar,
  boolean,
  int,
  decimal,
  text,
  tinyint,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { constants } from "@pkg/utils";

const { ROLES, STATUS, PROPOSAL_STATUS, WORK_ORDER_STATUS } = constants;

export const userTable = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    contact_number: varchar("contact_number", { length: 15 }),
    role: varchar("role", {
      length: 50,
      enum: [
        ROLES.ADMIN,
        ROLES.MANAGER,
        ROLES.OFFICE_OPERATOR,
        ROLES.SITE_OPERATOR,
        ROLES.VIEWER,
      ],
    })
      .notNull()
      .default(ROLES.OFFICE_OPERATOR),
    created_by: int("created_by"),
    status: varchar("status", {
      length: 50,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
    })
      .notNull()
      .default(STATUS.ACTIVE),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("name_idx").on(table.name),
    uniqueIndex("email_idx").on(table.email),
  ],
);

export const clientTable = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  state: varchar("state", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  gst_number: varchar("gst_number", { length: 15 }).notNull(),
  contact_number: varchar("contact_number", {
    length: 15,
  }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  status: varchar("status", {
    length: 50,
    enum: [STATUS.ACTIVE, STATUS.INACTIVE],
  })
    .notNull()
    .default(STATUS.ACTIVE),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const proposalTable = mysqlTable(
  "proposals",
  {
    id: int("id").autoincrement().primaryKey(),
    client_id: int("client_id")
      .notNull()
      .references(() => clientTable.id, { onDelete: "cascade" }),
    office_id: int("office_id")
      .notNull()
      .references(() => officeTable.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 255 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    document_key: varchar("document_key", { length: 255 }).notNull(),
    description: text("description"),
    proposal_submission_date: timestamp("proposal_submission_date").notNull(),

    status: varchar("status", {
      length: 50,
      enum: [
        PROPOSAL_STATUS.APPROVED,
        PROPOSAL_STATUS.REJECTED,
        PROPOSAL_STATUS.PENDING,
      ],
    })
      .notNull()
      .default(PROPOSAL_STATUS.PENDING),
    created_by: int("created_by").references(() => userTable.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("proposal_client_idx").on(table.client_id),
    index("proposal_status_idx").on(table.status),
  ],
);
export const officeTable = mysqlTable(
  "offices",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    state: varchar("state", { length: 255 }).notNull(),
    city: varchar("city", { length: 255 }).notNull(),
    gst_number: varchar("gst_number", { length: 15 }).notNull(),
    pincode: varchar("pincode", { length: 10 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    status: varchar("status", {
      length: 50,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
    })
      .notNull()
      .default(STATUS.ACTIVE),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("name_idx").on(table.name),
    index("city_idx").on(table.city),
    index("state_idx").on(table.state),
  ],
);

export const siteTable = mysqlTable(
  "sites",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    state: varchar("state", { length: 255 }).notNull(),
    city: varchar("city", { length: 255 }).notNull(),
    pincode: varchar("pincode", { length: 10 }).notNull(),
    office_id: int("office_id")
      .notNull()
      .references(() => officeTable.id, { onDelete: "cascade" })
      .notNull(),
    status: varchar("status", {
      length: 50,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
    })
      .notNull()
      .default(STATUS.ACTIVE),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("site_name_idx").on(table.name),
    index("site_city_idx").on(table.city),
    index("site_state_idx").on(table.state),
    index("site_office_idx").on(table.office_id),
  ],
);

export const workOrderTable = mysqlTable(
  "work_orders",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 255 }).notNull().unique(),
    agreement_number: varchar("agreement_number", { length: 255 }).notNull(),
    rate_contract_number: varchar("rate_contract_number", {
      length: 255,
    }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    proposal_id: int("proposal_id")
      .notNull()
      .references(() => proposalTable.id, { onDelete: "cascade" }),
    client_id: int("client_id")
      .notNull()
      .references(() => clientTable.id, { onDelete: "cascade" }),
    office_id: int("office_id")
      .notNull()
      .references(() => officeTable.id, { onDelete: "cascade" }),
    start_date: timestamp("start_date").notNull(),
    end_date: timestamp("end_date").notNull(),
    handing_over_date: timestamp("handing_over_date").notNull(),
    document_key: varchar("document_key", { length: 255 }).notNull(),
    process_type: varchar("process_type", {
      length: 50,
    }).notNull(),
    description: text("description"),
    status: varchar("status", {
      length: 50,
      enum: [
        WORK_ORDER_STATUS.PENDING,
        WORK_ORDER_STATUS.COMPLETED,
        WORK_ORDER_STATUS.CANCELLED,
      ],
    })
      .notNull()
      .default(WORK_ORDER_STATUS.PENDING),
    cancellation_reason: text("cancellation_reason"),
    approved_at: timestamp("approved_at"),
    approved_by: int("approved_by").references(() => userTable.id, {
      onDelete: "set null",
    }),
    created_by: int("created_by").references(() => userTable.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("wo_client_idx").on(table.client_id),
    index("wo_office_idx").on(table.office_id),
    index("wo_status_idx").on(table.status),
    index("wo_dates_idx").on(table.start_date, table.end_date),
    index("wo_approved_at_idx").on(table.approved_at),
  ],
);

export const scheduleOfRatesTable = mysqlTable("schedule_of_rates", {
  id: int("id").autoincrement().primaryKey(),
  work_order_id: int("work_order_id")
    .notNull()
    .references(() => workOrderTable.id, { onDelete: "cascade" }),
  activity: varchar("activity", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 10 }).notNull(),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }).notNull(),
  rc_unit_rate: decimal("rc_unit_rate", {
    precision: 20,
    scale: 2,
  }).notNull(),
  gst_percentage: decimal("gst_percentage", {
    precision: 10,
    scale: 2,
  })
    .default("18")
    .notNull(),
  unit_rate_inc_gst: decimal("unit_rate_inc_gst", {
    precision: 20,
    scale: 2,
  }).notNull(),
  total_cost: decimal("total_cost", {
    precision: 20,
    scale: 2,
  }).notNull(),
  transportation_km: decimal("transportation_km", {
    precision: 10,
    scale: 2,
  }),
  created_at: timestamp("created_at").notNull().defaultNow(),

  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const clientContactTable = mysqlTable("client_contacts", {
  id: int("id").autoincrement().primaryKey(),
  client_id: int("client_id")
    .notNull()
    .references(() => clientTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  designation: varchar("designation", { length: 255 }),
  contact_number: varchar("contact_number", {
    length: 15,
  }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  contact_type: varchar("contact_type", { length: 255 }),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const officeUserTable = mysqlTable(
  "office_users",
  {
    id: int("id").autoincrement().primaryKey(),
    user_id: int("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    office_id: int("office_id")
      .notNull()
      .references(() => officeTable.id, { onDelete: "cascade" }),
    assigned_by: int("assigned_by").references(() => userTable.id, {
      onDelete: "set null",
    }),
    role: varchar("role", {
      length: 50,
      enum: ["office_manager", "operator"],
    }).notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("office_user_unique_idx").on(table.office_id, table.user_id),
    index("office_user_office_idx").on(table.office_id),
    index("office_user_user_idx").on(table.user_id),
  ],
);

export const workOrderSiteTable = mysqlTable(
  "work_order_sites",
  {
    id: int("id").autoincrement().primaryKey(),
    work_order_id: int("work_order_id")
      .notNull()
      .references(() => workOrderTable.id, { onDelete: "cascade" }),
    client_id: int("client_id")
      .notNull()
      .references(() => clientTable.id, { onDelete: "cascade" }),
    site_id: int("site_id")
      .notNull()
      .references(() => siteTable.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    end_date: timestamp("end_date").notNull(),
    process_type: varchar("process_type", {
      length: 50,
    }).notNull(),

    job_number: varchar("job_number", { length: 255 }).notNull(),
    area: varchar("area", { length: 255 }).notNull(),
    installation_type: varchar("installation", { length: 255 }).notNull(),
    joint_estimate_number: varchar("joint_estimate_number", {
      length: 255,
    }).notNull(),
    land_owner_name: varchar("land_owner_name", { length: 255 }).notNull(),
    remarks: varchar("remarks", { length: 255 }).notNull(),
    status: varchar("status", {
      length: 50,
      enum: [
        WORK_ORDER_STATUS.PENDING,
        WORK_ORDER_STATUS.COMPLETED,
        WORK_ORDER_STATUS.CANCELLED,
      ],
    })
      .notNull()
      .default(WORK_ORDER_STATUS.PENDING),
    is_completed: boolean("isCompleted").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("wo_site_unique_idx").on(table.work_order_id, table.site_id),
    index("wo_site_work_order_idx").on(table.work_order_id),
    index("wo_site_site_idx").on(table.site_id),
    index("wo_site_status_idx").on(table.status),
  ],
);

export const workOrderSiteUserTable = mysqlTable(
  "work_order_site_users",
  {
    id: int("id").autoincrement().primaryKey(),
    work_order_site_id: int("work_order_site_id")
      .notNull()
      .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
    user_id: int("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex("wosu_wo_site_user_idx").on(
      table.work_order_site_id,
      table.user_id,
    ),
    index("wosu_user_idx").on(table.user_id),
  ],
);

export const workOrderSiteOperatorUploadTable = mysqlTable(
  "wo_site_oprtr_docs",
  {
    id: int("id").autoincrement().primaryKey(),
    work_order_site_id: int("work_order_site_id")
      .notNull()
      .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
    uploaded_by_user_id: int("uploaded_by_user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    file_name: varchar("file_name", { length: 512 }),
    document_url: text("document_url").notNull(),
    document_id: varchar("document_id", { length: 255 }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("wosou_wo_site_idx").on(table.work_order_site_id),
    index("wosou_user_idx").on(table.uploaded_by_user_id),
  ],
);

export const siteActivityTable = mysqlTable("site_activity_items", {
  id: int("id").autoincrement().primaryKey(),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  schedule_of_rates_id: int("schedule_of_rates_id")
    .notNull()
    .references(() => scheduleOfRatesTable.id, { onDelete: "cascade" }),
  activity: varchar("activity", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 255 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const workOrderSiteDocsTable = mysqlTable("work_order_site_docs", {
  id: int("id").autoincrement().primaryKey(),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  document_url: varchar("document_url", { length: 255 }).notNull(),
  document_id: varchar("document_id", { length: 255 }),

  type: varchar("type", {
    enum: [
      "sub_wo",
      "estimate",
      "completion",
      "measurement_sheet",
      "bills",
      "completion_certificate",
    ],
    length: 255,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const cleaningUpSoilAreaTable = mysqlTable("clean_soil_area", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }),
  transportation_km: decimal("transportation_km", {
    precision: 10,
    scale: 2,
  }),
  type: varchar("type", {
    enum: ["estimate_sub-wo", "completion"],
    length: 255,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
export const liftingRecoveryOilSlushTable = mysqlTable("lifting_oil_slush", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }),
  transportation_km: decimal("transportation_km", {
    precision: 10,
    scale: 2,
  }),
  type: varchar("type", {
    enum: ["estimate_sub-wo", "completion"],
    length: 255,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
export const excavationContSoilTable = mysqlTable("excav_cont_soil", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }),
  transportation_km: decimal("transportation_km", {
    precision: 10,
    scale: 2,
  }),
  type: varchar("type", {
    enum: ["estimate_sub-wo", "completion"],
    length: 255,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const transportationContSoilTable = mysqlTable("trans_cont_soil", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }),
  transportation_km: decimal("transportation_km", {
    precision: 10,
    scale: 2,
  }),
  type: varchar("type", {
    enum: ["estimate_sub-wo", "completion"],
    length: 255,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const refillingExcavatedContSoilTable = mysqlTable("refill_excav_soil", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }),
  transportation_km: decimal("transportation_km", {
    precision: 10,
    scale: 2,
  }),
  type: varchar("type", {
    enum: ["estimate_sub-wo", "completion"],
    length: 255,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});
export const bioremediationContSoilTable = mysqlTable("biorem_cont_soil", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }).notNull(),
  amount: decimal("amount", { precision: 20, scale: 2 }),
  transportation_km: decimal("transportation_km", {
    precision: 10,
    scale: 2,
  }),
  type: varchar("type", {
    enum: ["estimate_sub-wo", "completion"],
    length: 255,
  }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const bioSampleTable = mysqlTable("bio_samples", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  biorem_cont_soil_id: int("biorem_cont_soil_id").references(
    () => bioremediationContSoilTable.id,
    { onDelete: "cascade" },
  ),
  tph_document_url: varchar("tph_document_url", { length: 255 }).notNull(),
  tph_value: decimal("tph_value", {
    precision: 10,
    scale: 2,
  }).notNull(),

  application_month: varchar("application_month", { length: 255 }).notNull(),

  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const bioOilZappingTable = mysqlTable("bio_oil_zapping", {
  id: int("id").autoincrement().primaryKey(),
  site_activity_id: int("site_activity_id").references(
    () => siteActivityTable.id,
    { onDelete: "cascade" },
  ),
  work_order_site_id: int("work_order_site_id")
    .notNull()
    .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
  bio_sample_id: int("bio_sample_id").references(() => bioSampleTable.id, {
    onDelete: "cascade",
  }),
  document_url: varchar("document_url", { length: 255 }),
  estimated_quantity: decimal("estimated_quantity", {
    precision: 20,
    scale: 2,
  }),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export const contractorTable = mysqlTable(
  "contractors",
  {
    id: int("id").autoincrement().primaryKey(),
    office_id: int("office_id")
      .notNull()
      .references(() => officeTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    contact_number: varchar("contact_number", { length: 15 }),
    email: varchar("email", { length: 320 }),
    address: varchar("address", { length: 500 }),
    gst_number: varchar("gst_number", { length: 15 }),
    pan_number: varchar("pan_number", { length: 10 }),
    status: varchar("status", {
      length: 50,
      enum: [STATUS.ACTIVE, STATUS.INACTIVE],
    })
      .notNull()
      .default(STATUS.ACTIVE),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("contractor_office_idx").on(table.office_id),
    index("contractor_name_idx").on(table.name),
  ],
);

export const workOrderSiteExpenseTable = mysqlTable(
  "wo_site_expenses",
  {
    id: int("id").autoincrement().primaryKey(),
    work_order_site_id: int("work_order_site_id")
      .notNull()
      .references(() => workOrderSiteTable.id, { onDelete: "cascade" }),
    expense_type: varchar("expense_type", {
      length: 50,
      enum: [
        "contractor_payment",
        "labour",
        "material",
        "equipment",
        "miscellaneous",
      ],
    }).notNull(),
    contractor_id: int("contractor_id").references(() => contractorTable.id, {
      onDelete: "set null",
    }),
    description: varchar("description", { length: 500 }).notNull(),
    amount: decimal("amount", { precision: 20, scale: 2 }).notNull(),
    expense_date: timestamp("expense_date").notNull(),
    invoice_number: varchar("invoice_number", { length: 100 }),
    notes: text("notes"),
    activity_key: varchar("activity_key", { length: 100 }),
    quantity: decimal("quantity", { precision: 20, scale: 4 }),
    is_exceeded: tinyint("is_exceeded").notNull().default(0),
    document_url: varchar("document_url", { length: 500 }),
    document_id: varchar("document_id", { length: 255 }),
    created_by: int("created_by").references(() => userTable.id, {
      onDelete: "set null",
    }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("expense_wo_site_idx").on(table.work_order_site_id),
    index("expense_contractor_idx").on(table.contractor_id),
    index("expense_type_idx").on(table.expense_type),
    index("expense_date_idx").on(table.expense_date),
  ],
);

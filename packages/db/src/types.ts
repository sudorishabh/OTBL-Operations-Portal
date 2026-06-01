import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { constants } from "@pkg/utils";
import {
  userTable,
  clientTable,
  proposalTable,
  officeTable,
  siteTable,
  workOrderTable,
  clientContactTable,
  officeUserTable,
  workOrderSiteTable,
  workOrderSiteUserTable,
  workOrderSiteOperatorUploadTable,
  siteActivityTable,
} from "./schema";

const {
  PROPOSAL_STATUS,
  WORK_ORDER_STATUS,
  ACTIVITY_TYPE,
  ACTIVITY_PHASE,
  ACTIVITY_ITEM_TABLES,
} = constants;

export type User = InferSelectModel<typeof userTable>;
export type NewUser = InferInsertModel<typeof userTable>;

export type Client = InferSelectModel<typeof clientTable>;
export type NewClient = InferInsertModel<typeof clientTable>;

export type ClientContact = InferSelectModel<typeof clientContactTable>;
export type NewClientContact = InferInsertModel<typeof clientContactTable>;

export type Proposal = InferSelectModel<typeof proposalTable>;
export type NewProposal = InferInsertModel<typeof proposalTable>;

export type ProposalStatus =
  (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

export type Office = InferSelectModel<typeof officeTable>;
export type NewOffice = InferInsertModel<typeof officeTable>;

export type OfficeUser = InferSelectModel<typeof officeUserTable>;
export type NewOfficeUser = InferInsertModel<typeof officeUserTable>;

export type Site = InferSelectModel<typeof siteTable>;
export type NewSite = InferInsertModel<typeof siteTable>;

export type WorkOrder = InferSelectModel<typeof workOrderTable>;
export type NewWorkOrder = InferInsertModel<typeof workOrderTable>;

export type WorkOrderSite = InferSelectModel<typeof workOrderSiteTable>;
export type NewWorkOrderSite = InferInsertModel<typeof workOrderSiteTable>;

export type WorkOrderSiteUser = InferSelectModel<typeof workOrderSiteUserTable>;
export type NewWorkOrderSiteUser = InferInsertModel<
  typeof workOrderSiteUserTable
>;

export type WorkOrderSiteOperatorUpload = InferSelectModel<
  typeof workOrderSiteOperatorUploadTable
>;
export type NewWorkOrderSiteOperatorUpload = InferInsertModel<
  typeof workOrderSiteOperatorUploadTable
>;

export type WorkOrderStatus =
  (typeof WORK_ORDER_STATUS)[keyof typeof WORK_ORDER_STATUS];

export type ActivityTypeEnum =
  (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE];

export type SiteActivity = InferSelectModel<typeof siteActivityTable>;
export type NewSiteActivity = InferInsertModel<typeof siteActivityTable>;

export type ActivityItemTableName =
  (typeof ACTIVITY_ITEM_TABLES)[keyof typeof ACTIVITY_ITEM_TABLES];

export type ActivityPhase =
  (typeof ACTIVITY_PHASE)[keyof typeof ACTIVITY_PHASE];

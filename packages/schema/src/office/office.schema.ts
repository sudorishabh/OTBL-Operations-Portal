import { z } from "zod";
import { constants } from "@pkg/utils";
import {
  nameValidator,
  emailValidator,
  addressValidator,
  cityValidator,
  stateValidator,
  pincodeValidator,
  gstNumberValidator,
  positiveIntValidator,
  optionalPositiveIntValidator,
  searchQueryValidator,
} from "../validators";

const { STATUS } = constants;

// Enums
const statusEnum = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);
// Office membership role; "operator" here is an Office Operator (distinct from
// a Site Operator, which is a site_users assignment with no stored role).
const officeRoleEnum = z.enum(["manager", "operator"]);
const officeNamesOrderEnum = z.enum(["asc", "desc", "latest", "oldest"]);

// Base Schemas

const officeBaseSchema = z.object({
  name: nameValidator,
  address: addressValidator,
  state: stateValidator,
  city: cityValidator,
  pincode: pincodeValidator,
  gst_number: gstNumberValidator,
  email: emailValidator,
});

// Mutation Schemas

export const createOfficeSchema = officeBaseSchema.extend({
  manager_id: optionalPositiveIntValidator,
  /** User IDs to add as Office Operators (office_users.role = "operator"). */
  operator_ids: z.array(positiveIntValidator).optional(),
  status: statusEnum.optional(),
});

export const updateOfficeSchema = officeBaseSchema.extend({
  id: positiveIntValidator,
  status: statusEnum.optional(),
});

export const assignUserToOfficeSchema = z.object({
  office_id: positiveIntValidator,
  user_id: positiveIntValidator,
  role: officeRoleEnum,
});

export const expelUserFromOfficeSchema = z.object({
  office_id: positiveIntValidator,
  user_id: positiveIntValidator,
});

// Query Schemas

export const getOfficesSchema = z.object({
  searchQuery: searchQueryValidator,
  status: z.enum([...statusEnum.options, "all"]).optional(),
  officeNamesOrder: officeNamesOrderEnum.optional(),
});

export const getOfficeSchema = z.object({ officeId: positiveIntValidator });

export const getOfficeWorkOrderSchema = z.object({
  officeId: positiveIntValidator,
});

export const getOfficeStatsSchema = z.object({
  officeId: positiveIntValidator,
});

export const getOfficeUsersSchema = z.object({
  office_id: positiveIntValidator,
});

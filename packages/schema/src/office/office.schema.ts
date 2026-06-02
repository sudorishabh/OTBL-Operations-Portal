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

const statusEnum = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);
const officeRoleEnum = z.enum(["office_manager", "operator"]);
const officeNamesOrderEnum = z.enum(["asc", "desc", "latest", "oldest"]);

const officeBaseSchema = z.object({
  name: nameValidator,
  address: addressValidator,
  state: stateValidator,
  city: cityValidator,
  pincode: pincodeValidator,
  gst_number: gstNumberValidator,
  email: emailValidator,
});

export const createOfficeSchema = officeBaseSchema.extend({
  manager_id: optionalPositiveIntValidator,
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

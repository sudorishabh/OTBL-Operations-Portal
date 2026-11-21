import { z } from "zod";
import {
  nameValidator,
  emailValidator,
  addressValidator,
  cityValidator,
  stateValidator,
  pincodeValidator,
  gstNumberValidator,
  positiveIntValidator,
  searchQueryValidator,
  pageValidator,
  limitValidator,
} from "../validators";

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
  operator_ids: z.array(positiveIntValidator).optional(),
});

export const updateOfficeSchema = officeBaseSchema.extend({
  id: positiveIntValidator,
});

export const assignUserToOfficeSchema = z.object({
  office_id: positiveIntValidator,
  user_id: positiveIntValidator,
});

export const expelUserFromOfficeSchema = z.object({
  office_id: positiveIntValidator,
  user_id: positiveIntValidator,
});

// Without a page every matching office comes back, for pickers and lookups.
export const getOfficesSchema = z.object({
  searchQuery: searchQueryValidator,
  state: z.string().trim().max(255).optional(),
  officeNamesOrder: officeNamesOrderEnum.optional(),
  page: pageValidator.optional(),
  limit: limitValidator,
});

export const getOfficeSchema = z.object({ officeId: positiveIntValidator });

export const getOfficeUsersSchema = z.object({
  office_id: positiveIntValidator,
});

import z from "zod";
import { constants } from "@pkg/utils";
import {
  nameValidator,
  addressValidator,
  cityValidator,
  stateValidator,
  pincodeValidator,
  positiveIntValidator,
  searchQueryValidator,
  pageValidator,
  limitValidator,
} from "../validators";

const { STATUS } = constants;

const statusEnum = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);

export const siteBaseSchema = z.object({
  name: nameValidator,
  address: addressValidator,
  state: stateValidator,
  city: cityValidator,
  pincode: pincodeValidator,
});

export const createSiteSchema = siteBaseSchema.extend({
  office_id: positiveIntValidator,
});

export const updateSiteSchema = siteBaseSchema.extend({
  siteId: positiveIntValidator,
});

export const getSiteSchema = z.object({ siteId: positiveIntValidator });

export const get6SitesByOfficeIdSchema = z.object({
  office_id: positiveIntValidator,
});

export const getAllSitesByOfficeIdSchema = z.object({
  office_id: positiveIntValidator,
  searchQuery: searchQueryValidator,
  status: z.enum(["all", "active", "inactive"]).optional(),
  page: pageValidator,
  limit: limitValidator,
});

import z from "zod";
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

export const getAllSitesByOfficeIdSchema = z.object({
  office_id: positiveIntValidator,
  searchQuery: searchQueryValidator,
  page: pageValidator,
  limit: limitValidator,
});

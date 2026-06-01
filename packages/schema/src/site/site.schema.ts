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

// Base Schemas

export const siteBaseSchema = z.object({
  name: nameValidator,
  address: addressValidator,
  state: stateValidator,
  city: cityValidator,
  pincode: pincodeValidator,
});

// Mutation Schemas

export const createSiteSchema = siteBaseSchema.extend({
  office_id: positiveIntValidator,
});

export const updateSiteSchema = siteBaseSchema.extend({
  siteId: positiveIntValidator,
});

// Query Schemas

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
  /** Max site-operator rows returned per site (default 6). Use a higher value when managing assignments. */
  siteUsersLimit: z.number().int().min(1).max(100).optional(),
});

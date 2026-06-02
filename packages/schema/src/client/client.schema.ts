import z from "zod";
import {
  nameValidator,
  emailValidator,
  addressValidator,
  cityValidator,
  stateValidator,
  pincodeValidator,
  gstNumberValidator,
  mobileValidator,
  positiveIntValidator,
  searchQueryValidator,
} from "../validators";
import { constants } from "@pkg/utils";

const { STATUS } = constants;

const statusEnum = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);

export const createClientSchema = z.object({
  name: nameValidator,
  address: addressValidator,
  state: stateValidator,
  city: cityValidator,
  pincode: pincodeValidator,
  gst_number: gstNumberValidator,
  contact_number: mobileValidator,
  email: emailValidator,
  status: statusEnum.optional(),
});

export const updateClientSchema = createClientSchema.extend({
  id: positiveIntValidator,
});

export const createClientContactSchema = z.object({
  client_id: positiveIntValidator,
  name: nameValidator,
  designation: z
    .string()
    .trim()
    .max(100, "Designation cannot exceed 100 characters")
    .optional(),
  contact_number: mobileValidator,
  email: emailValidator,
  contact_type: z
    .string()
    .trim()
    .max(50, "Contact type cannot exceed 50 characters")
    .optional(),
});

export const updateClientContactSchema = createClientContactSchema.extend({
  id: positiveIntValidator,
});

export const createClientWithContactsSchema = z.object({
  client: createClientSchema,
  contacts: z
    .array(createClientContactSchema.omit({ client_id: true }))
    .optional(),
});

export const updateClientWithContactsSchema = z.object({
  clientId: positiveIntValidator,
  client: createClientSchema.partial(),
  contactsToAdd: z
    .array(createClientContactSchema.omit({ client_id: true }))
    .optional(),
  contactsToRemove: z.array(positiveIntValidator).optional(),
});

export const deleteClientContactSchema = z.object({
  clientContactId: positiveIntValidator,
});
export const deleteClientSchema = z.object({ clientId: positiveIntValidator });

export const getAllClientsSchema = z.object({
  searchQuery: searchQueryValidator,
  status: z.enum(["all", "active", "inactive"]).optional(),
});

export const getAllClientContactsSchema = z.object({
  searchQuery: searchQueryValidator.optional(),
  clientId: z.string().optional(),
});

export const getClientSchema = z.object({ clientId: positiveIntValidator });

export const getClientContactSchema = z.object({
  clientContactId: positiveIntValidator,
});

export const getClientContactsSchema = z.object({
  clientId: z.number(),
});

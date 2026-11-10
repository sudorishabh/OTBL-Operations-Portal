import z from "zod";
import {
  nameValidator,
  emailValidator,
  optionalEmailValidator,
  addressValidator,
  cityValidator,
  stateValidator,
  pincodeValidator,
  gstNumberValidator,
  contactNumberValidator,
  optionalContactNumberValidator,
  positiveIntValidator,
  searchQueryValidator,
  pageValidator,
  limitValidator,
} from "../validators";
import { constants } from "@pkg/utils";

const { STATUS } = constants;

const statusEnum = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);

// The details a main client and each of its branches both have.
const clientDetailsSchema = z.object({
  name: nameValidator,
  address: addressValidator,
  state: stateValidator,
  city: cityValidator,
  pincode: pincodeValidator,
  gst_number: gstNumberValidator,
  contact_number: optionalContactNumberValidator,
  email: optionalEmailValidator,
  status: statusEnum.optional(),
});

// A contact person's own fields; who they belong to is given apart.
export const clientContactFieldsSchema = z.object({
  name: nameValidator,
  designation: z
    .string()
    .trim()
    .max(100, "Designation cannot exceed 100 characters")
    .optional(),
  contact_number: contactNumberValidator,
  email: emailValidator,
  contact_type: z
    .string()
    .trim()
    .max(50, "Contact type cannot exceed 50 characters")
    .optional(),
});

const contactsToAddValidator = z.array(clientContactFieldsSchema).optional();
const contactsToRemoveValidator = z.array(positiveIntValidator).optional();

export const createParentClientSchema = clientDetailsSchema;

export const updateParentClientSchema = createParentClientSchema.extend({
  id: positiveIntValidator,
});

export const createParentClientWithContactsSchema = z.object({
  parentClient: createParentClientSchema,
  contacts: contactsToAddValidator,
});

export const updateParentClientWithContactsSchema = z.object({
  parentClientId: positiveIntValidator,
  parentClient: createParentClientSchema.partial(),
  contactsToAdd: contactsToAddValidator,
  contactsToRemove: contactsToRemoveValidator,
});

export const deleteParentClientSchema = z.object({
  parentClientId: positiveIntValidator,
});

export const getParentClientSchema = z.object({
  parentClientId: positiveIntValidator,
});

export const createClientSchema = clientDetailsSchema.extend({
  // null leaves the client as a standalone, ungrouped client.
  parent_client_id: positiveIntValidator.nullable().optional(),
});

export const updateClientSchema = createClientSchema.extend({
  id: positiveIntValidator,
});

// Exactly one of a client (branch) or a main client.
const hasOneContactOwner = (owner: {
  client_id?: number;
  parent_client_id?: number;
}) => (owner.client_id === undefined) !== (owner.parent_client_id === undefined);

export const createClientContactSchema = clientContactFieldsSchema
  .extend({
    client_id: positiveIntValidator.optional(),
    parent_client_id: positiveIntValidator.optional(),
  })
  .refine(hasOneContactOwner, {
    message: "A contact belongs to either a client or a main client",
    path: ["client_id"],
  });

export const updateClientContactSchema = clientContactFieldsSchema.extend({
  id: positiveIntValidator,
});

export const createClientWithContactsSchema = z.object({
  client: createClientSchema,
  contacts: contactsToAddValidator,
});

export const updateClientWithContactsSchema = z.object({
  clientId: positiveIntValidator,
  client: createClientSchema.partial(),
  contactsToAdd: contactsToAddValidator,
  contactsToRemove: contactsToRemoveValidator,
});

export const deleteClientContactSchema = z.object({
  clientContactId: positiveIntValidator,
});
export const deleteClientSchema = z.object({ clientId: positiveIntValidator });

// How the clients list is ordered: by name, or by when they were added.
export const clientSortEnum = z.enum(["name_asc", "name_desc", "newest", "oldest"]);

export const getAllClientsSchema = z.object({
  searchQuery: searchQueryValidator,
  status: z.enum(["all", "active", "inactive"]).optional(),
  // A main client's id, or "none" for clients without a main client.
  parentClientId: z.union([positiveIntValidator, z.literal("none")]).optional(),
  state: z.string().trim().max(255).optional(),
  sort: clientSortEnum.optional(),
});

// A page counts main clients (with all their branches) and clients without one.
export const getClientGroupsSchema = getAllClientsSchema.extend({
  page: pageValidator,
  limit: limitValidator,
});

// Without a page every matching contact comes back, for pickers.
export const getAllClientContactsSchema = z.object({
  searchQuery: searchQueryValidator.optional(),
  clientId: z.string().optional(),
  sort: z.enum(["newest", "oldest", "name_asc", "name_desc"]).optional(),
  page: pageValidator.optional(),
  limit: limitValidator,
});

export const getClientSchema = z.object({ clientId: positiveIntValidator });

export const getClientContactSchema = z.object({
  clientContactId: positiveIntValidator,
});

// A client's (branch's) or a main client's contacts.
export const getClientContactsSchema = z
  .object({
    clientId: positiveIntValidator.optional(),
    parentClientId: positiveIntValidator.optional(),
  })
  .refine(
    (owner) =>
      hasOneContactOwner({
        client_id: owner.clientId,
        parent_client_id: owner.parentClientId,
      }),
    { message: "Give either a client or a main client", path: ["clientId"] },
  );

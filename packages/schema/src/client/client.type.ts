import { z } from "zod";

import * as clientSchemas from "./client.schema";

export type createParentClientInput = z.infer<
  typeof clientSchemas.createParentClientSchema
>;

export type updateParentClientInput = z.infer<
  typeof clientSchemas.updateParentClientSchema
>;

export type createParentClientWithContactsInput = z.infer<
  typeof clientSchemas.createParentClientWithContactsSchema
>;

export type updateParentClientWithContactsInput = z.infer<
  typeof clientSchemas.updateParentClientWithContactsSchema
>;

// Main clients added before they had details have none.
export type parentClientType = {
  id: number;
  name: string;
  address: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  gst_number: string | null;
  contact_number: string | null;
  email: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type createClientInput = z.infer<
  typeof clientSchemas.createClientSchema
>;

export type clientContactFieldsInput = z.infer<
  typeof clientSchemas.clientContactFieldsSchema
>;

export type createClientContactInput = z.infer<
  typeof clientSchemas.createClientContactSchema
>;

export type createClientWithContactsInput = z.infer<
  typeof clientSchemas.createClientWithContactsSchema
>;

// A contact person of a client (branch) or of a main client.
export type clientUsersType = {
  id: number;
  name: string;
  client_id: number | null;
  parent_client_id: number | null;
  created_at: string;
  updated_at: string;
  contact_number: string;
  email: string;
  designation: string | null;
  contact_type: string | null;
};

export type clientType = {
  address: string;
  id: number;
  parent_client_id: number | null;
  name: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  state: string;
  city: string;
  pincode: string;
  gst_number: string;
  contact_number: string | null;
  email: string | null;
};

export type getClientReturnType = {
  client: clientType;
  clientUsers: clientUsersType[];
};

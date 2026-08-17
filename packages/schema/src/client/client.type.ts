import { z } from "zod";

import * as clientSchemas from "./client.schema";

export type createClientInput = z.infer<
  typeof clientSchemas.createClientSchema
>;

export type createClientContactInput = z.infer<
  typeof clientSchemas.createClientContactSchema
>;

export type createClientWithContactsInput = z.infer<
  typeof clientSchemas.createClientWithContactsSchema
>;

export type clientUsersType = {
  id: number;
  name: string;
  client_id: number;
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

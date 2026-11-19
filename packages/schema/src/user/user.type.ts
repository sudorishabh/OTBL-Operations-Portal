import z from "zod";
import * as userSchema from "./user.schema";

export type CreateUserType = z.infer<typeof userSchema.createUserSchema>;

export type UpdateUserType = z.infer<typeof userSchema.updateUserSchema>;

export type UpdateUserPasswordType = z.infer<
  typeof userSchema.updateUserPasswordSchema
>;

export type UserBaseType = {
  id: number;
  code: string;
  name: string;
  email: string;
  contact_number: string;
  role: string;
  created_at: Date;
};

export type AllUserType = UserBaseType & {
  offices: {
    id: number;
    name: string;
    officeRole: string;
    type: "office";
  }[];
  sites: {
    id: number;
    name: string;
    type: "site";
  }[];
};

export type AllUsersQueryType = {
  users: AllUserType[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
};

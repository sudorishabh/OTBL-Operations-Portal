import { z } from "zod";
import { constants } from "@pkg/utils";
import {
  nameValidator,
  emailValidator,
  passwordValidator,
  optionalMobileValidator,
  pageValidator,
  limitValidator,
  searchQueryValidator,
  sortOrderValidator,
  positiveIntValidator,
} from "../validators";

const { ROLES, STATUS } = constants;

const userRoleEnum = z.enum([
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.OFFICE_OPERATOR,
  ROLES.SITE_OPERATOR,
  ROLES.VIEWER,
]);

const statusEnum = z.enum([STATUS.ACTIVE, STATUS.INACTIVE]);

export const createUserSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
  contact_number: optionalMobileValidator,
  role: userRoleEnum,
});

export const updateUserSchema = createUserSchema.extend({
  id: positiveIntValidator,
  password: z.union([passwordValidator, z.literal("")]).optional(),
});

export const updateUserPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordValidator,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const getAllUsersSchema = z.object({
  page: pageValidator,
  limit: limitValidator,
  searchQuery: searchQueryValidator,
  role: z
    .enum([
      "all",
      ROLES.MANAGER,
      ROLES.OFFICE_OPERATOR,
      ROLES.SITE_OPERATOR,
      ROLES.VIEWER,
    ])
    .optional(),
  status: z.enum([...statusEnum.options, "all"]).optional(),
  userNamesOrder: sortOrderValidator,
});

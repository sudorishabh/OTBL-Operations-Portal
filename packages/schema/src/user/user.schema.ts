import { z } from "zod";
import { constants } from "@pkg/utils";
import {
  nameValidator,
  emailValidator,
  passwordValidator,
  optionalContactNumberValidator,
  pageValidator,
  limitValidator,
  searchQueryValidator,
  sortOrderValidator,
  positiveIntValidator,
} from "../validators";

const { ROLES } = constants;

const userRoleEnum = z.enum([
  ROLES.ADMIN,
  ROLES.OFFICE_OPERATOR,
  ROLES.SITE_OPERATOR,
  ROLES.VIEWER,
]);

export const createUserSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  password: passwordValidator,
  contact_number: optionalContactNumberValidator,
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
      ROLES.OFFICE_OPERATOR,
      ROLES.SITE_OPERATOR,
      ROLES.VIEWER,
    ])
    .optional(),
  // Users working at the office: its seats, and site operators on its work
  // orders.
  officeId: positiveIntValidator.optional(),
  // Viewers see everything, so they count as neither.
  assignment: z.enum(["assigned", "unassigned"]).optional(),
  userNamesOrder: sortOrderValidator,
});

// The list's filters other than role, for counting the users in each role.
export const getUserCountsSchema = getAllUsersSchema.pick({
  searchQuery: true,
  officeId: true,
  assignment: true,
});

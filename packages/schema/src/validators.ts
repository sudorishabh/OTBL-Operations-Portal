import { Schema, z } from "zod";

export const nameValidator = z
  .string({ message: "Name is required" })
  .trim()
  .toLowerCase()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name cannot exceed 100 characters");

export const titleValidator = z
  .string({ message: "Title is required" })
  .trim()
  .min(3, "Title must be at least 3 characters")
  .max(255, "Title cannot exceed 255 characters");

export const shortDescriptionValidator = z
  .string()
  .trim()
  .max(500, "Description cannot exceed 500 characters")
  .optional();

export const longDescriptionValidator = z
  .string()
  .trim()
  .max(5000, "Description cannot exceed 5000 characters")
  .optional();

export const requiredDescriptionValidator = z
  .string({ message: "Description is required" })
  .trim()
  .min(10, "Description must be at least 10 characters")
  .max(2000, "Description cannot exceed 2000 characters");

export const emailValidator = z
  .string({ message: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address")
  .max(320, "Email cannot exceed 320 characters");

export const optionalEmailValidator = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address")
  .max(320, "Email cannot exceed 320 characters")
  .optional()
  .or(z.literal(""));

export const mobileValidator = z
  .string({ message: "Mobile number is required" })
  .trim()
  .regex(
    /^(\+91[\-\s]?)?[6-9]\d{9}$/,
    "Please enter a valid Indian mobile number (10 digits starting with 6-9)",
  );

export const optionalMobileValidator = z
  .string()
  .trim()
  .regex(
    /^(\+91[\-\s]?)?[6-9]\d{9}$/,
    "Please enter a valid Indian mobile number (10 digits starting with 6-9)",
  )
  .optional()
  .or(z.literal(""));

export const passwordValidator = z
  .string({ message: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const strongPasswordValidator = passwordValidator.regex(
  /[!@#$%^&*(),.?":{}|<>]/,
  "Password must contain at least one special character (!@#$%^&*)",
);

export const loginPasswordValidator = z
  .string({ message: "Password is required" })
  .min(1, "Password is required");

export const addressValidator = z
  .string({ message: "Address is required" })
  .trim()
  .min(5, "Address must be at least 5 characters")
  .max(255, "Address cannot exceed 255 characters");

export const cityValidator = z
  .string({ message: "City is required" })
  .trim()
  .toLowerCase()
  .min(2, "City must be at least 2 characters")
  .max(100, "City cannot exceed 100 characters");

export const stateValidator = z
  .string({ message: "State is required" })
  .trim()
  .toLowerCase()
  .min(2, "State must be at least 2 characters")
  .max(100, "State cannot exceed 100 characters");

export const pincodeValidator = z
  .string({ message: "Pincode is required" })
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit pincode");

export const optionalPincodeValidator = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Please enter a valid 6-digit pincode")
  .optional()
  .or(z.literal(""));

export const gstNumberValidator = z
  .string({ message: "GST number is required" })
  .trim()
  .toUpperCase()
  .length(15, "GST number must be exactly 15 characters")
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)",
  );

export const optionalGstNumberValidator = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (val: any) =>
      !val ||
      val.length === 0 ||
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
    "Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)",
  )
  .optional()
  .or(z.literal(""));

export const codeValidator = z
  .string({ message: "Code is required" })
  .trim()
  .min(1, "Code is required")
  .max(50, "Code cannot exceed 50 characters")
  .regex(
    /^[A-Za-z0-9\-_]+$/,
    "Code can only contain letters, numbers, hyphens, and underscores",
  );

export const agreementNumberValidator = z
  .string({ message: "Agreement number is required" })
  .trim()
  .min(1, "Agreement number is required")
  .max(100, "Agreement number cannot exceed 100 characters");

export const positiveIntValidator = z
  .number({ message: "This field is required" })
  .int("Must be a whole number")
  .positive("Must be a positive number");

export const optionalPositiveIntValidator = z
  .number()
  .int("Must be a whole number")
  .positive("Must be a positive number")
  .optional();

export const nonNegativeNumberValidator = z.coerce
  .number({ message: "This field is required" })
  .min(0, "Value cannot be negative");

export const positiveNumberValidator = z
  .number({ message: "This field is required" })
  .positive("Must be greater than 0");

export const currencyValidator = z
  .number({ message: "Amount is required" })
  .min(0, "Amount cannot be negative")
  .multipleOf(0.01, "Amount can have maximum 2 decimal places");

export const metricTonValidator = z
  .number()
  .min(0, "Metric ton cannot be negative")
  .max(999999.99, "Metric ton value is too large")
  .optional();

export const rateValidator = z
  .number()
  .min(0, "Rate cannot be negative")
  .max(999999.99, "Rate value is too large")
  .optional();

export const dateValidator = z.coerce.date({
  message: "Please enter a valid date",
});

export const optionalDateValidator = z
  .string()
  .datetime()
  .optional()
  .nullable();

export const dateStringValidator = z
  .string({ message: "Date is required" })
  .refine(
    (val: string) => !isNaN(Date.parse(val)),
    "Please enter a valid date",
  );

export const createDateRangeValidator = (
  startField: string,
  endField: string,
) => {
  return z.object({}).refine(
    (data: Record<string, unknown>) => {
      const start = data[startField];
      const end = data[endField];
      if (!start || !end) return true;
      return new Date(end as string) >= new Date(start as string);
    },
    {
      message: `${endField.replace("_", " ")} must be on or after ${startField.replace("_", " ")}`,
      path: [endField],
    },
  );
};

export const urlValidator = z
  .string({ message: "URL is required" })
  .trim()
  .url("Please enter a valid URL")
  .max(2048, "URL cannot exceed 2048 characters");

export const optionalUrlValidator = z
  .string()
  .trim()
  .url("Please enter a valid URL")
  .max(2048, "URL cannot exceed 2048 characters")
  .optional()
  .or(z.literal(""));

export const documentKeyValidator = z
  .string({ message: "Document key is required" })
  .trim()
  .min(1, "Document key is required")
  .max(500, "Document key cannot exceed 500 characters");

export const pageValidator = z
  .number({ message: "Page number is required" })
  .int("Page must be a whole number")
  .min(1, "Page number must be at least 1");

export const limitValidator = z
  .number()
  .int("Limit must be a whole number")
  .min(1, "Limit must be at least 1")
  .max(100, "Limit cannot exceed 100")
  .default(10);

export const searchQueryValidator = z
  .string()
  .trim()
  .max(200, "Search query cannot exceed 200 characters")
  .optional();

export const sortOrderValidator = z
  .enum(["asc", "desc", "latest", "oldest"])
  .optional()
  .default("latest");

export const addressFieldsValidator = z.object({
  address: addressValidator,
  city: cityValidator,
  state: stateValidator,
  pincode: pincodeValidator,
});

export const contactFieldsValidator = z.object({
  email: emailValidator,
  mobile: mobileValidator,
});

export const paginationFieldsValidator = z.object({
  page: pageValidator,
  limit: limitValidator,
  searchQuery: searchQueryValidator,
});

export type AddressFields = z.infer<typeof addressFieldsValidator>;
export type ContactFields = z.infer<typeof contactFieldsValidator>;
export type PaginationFields = z.infer<typeof paginationFieldsValidator>;

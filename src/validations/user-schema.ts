import { z } from "zod";
import { UserRole } from "@/types/user.types";
import { passwordField } from "./auth-schema";

/**
 * User-management form schemas, mirroring the backend
 * `src/validations/user-validation.ts` so the client rejects the same input
 * the server would.
 */
export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(50),
  lastName: z.string().trim().min(1, "Enter a last name").max(50),
  email: z.email("Enter a valid email").max(255),
  password: passwordField,
  phone: z
    .string()
    .trim()
    .min(6, "Enter a full phone number")
    .max(20)
    .or(z.literal(""))
    .optional(),
  role: z.enum(UserRole),
});
export type CreateUserValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(50),
  lastName: z.string().trim().min(1, "Enter a last name").max(50),
  email: z.email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a full phone number")
    .max(20)
    .or(z.literal(""))
    .optional(),
});
export type EditUserValues = z.infer<typeof editUserSchema>;

import { z } from "zod";

/**
 * Auth form schemas. These mirror the backend's Zod validation
 * (agritrade-backend `src/validations/auth-validation.ts`) so the client
 * rejects the same input the server would. Login stays lenient on the
 * password (the server checks the credential); reset/change enforce the full
 * policy since they set a new one.
 */
export const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const twoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});
export type TwoFactorValues = z.infer<typeof twoFactorSchema>;

/** Format-agnostic - the backend normalizes case/dashes/spaces before hashing. */
export const recoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "Enter one of your recovery codes")
    .max(20, "That doesn't look like a recovery code"),
});
export type RecoveryCodeValues = z.infer<typeof recoveryCodeSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email"),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Mirrors the backend `passwordField` policy: 8–128 chars including an
 * uppercase letter, a lowercase letter, a number, and a special character.
 * `confirm` is client-only (the server takes just `password`).
 */
export const passwordField = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Use at most 128 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a special character");

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordField,
    confirm: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Mirrors the backend `updateProfileSchema` (auth PATCH /me). */
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(50),
  lastName: z.string().trim().min(1, "Enter your last name").max(50),
  email: z.email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a full phone number")
    .max(20)
    .or(z.literal(""))
    .optional(),
});
export type ProfileValues = z.infer<typeof profileSchema>;

import { z } from "zod";

/**
 * Farming-programme application schema - mirrors the backend's
 * `farm-application-validation.ts` `submitFarmApplicationSchema` (same
 * bounds, friendlier messages). Only name + phone are required: the office
 * would rather call an applicant to fill gaps than lose them to a long
 * form. The numeric fields (farm size, expected yield) are held as raw
 * strings so phones can clear and retype freely; they are converted to
 * numbers on submit. Phones stay permissive strings here - the backend
 * normalizes to E.164 and returns per-field errors for numbers it can't
 * parse.
 */

/**
 * An optional numeric text field: empty is fine, otherwise a non-negative
 * number to at most 2 decimal places (the backend records measured columns
 * to 2dp), capped at the backend's bound.
 */
const optionalNumericText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine(
      (v) =>
        !v ||
        (/^\d+(\.\d{1,2})?$/.test(v) &&
          Number.isFinite(Number(v)) &&
          Number(v) <= max),
      { message },
    );

export const farmApplicationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(150, "Please keep your name under 150 characters."),
  phone: z
    .string()
    .trim()
    .min(6, "We need a phone number to reach you.")
    .max(20, "That phone number looks too long."),
  email: z
    .union([
      z.literal(""),
      z.string().email("Please enter a valid email.").max(255),
    ])
    .optional(),
  community: z
    .string()
    .trim()
    .max(120, "Please keep this under 120 characters.")
    .optional(),
  address: z
    .string()
    .trim()
    .max(300, "Please keep this under 300 characters.")
    .optional(),
  farmLocation: z
    .string()
    .trim()
    .max(200, "Please keep this under 200 characters.")
    .optional(),
  farmSizeAcres: optionalNumericText(
    100_000,
    "Enter the size as a number of acres, e.g. 5 or 2.5.",
  ),
  crops: z
    .string()
    .trim()
    .max(300, "Please keep this under 300 characters.")
    .optional(),
  itemsNeeded: z
    .string()
    .trim()
    .max(1000, "Please keep this under 1000 characters.")
    .optional(),
  expectedYieldKg: optionalNumericText(
    10_000_000,
    "Enter the expected yield as a number of kilograms, e.g. 4000.",
  ),
  previousExperience: z
    .string()
    .trim()
    .max(1000, "Please keep this under 1000 characters.")
    .optional(),
  guarantorName: z
    .string()
    .trim()
    .max(150, "Please keep this under 150 characters.")
    .optional(),
  guarantorPhone: z
    .string()
    .trim()
    .max(20, "That phone number looks too long.")
    .optional()
    .refine((v) => !v || v.length >= 6, {
      message: "That phone number looks too short.",
    }),
  message: z
    .string()
    .trim()
    .max(2000, "Please keep this under 2000 characters.")
    .optional(),
  /**
   * Honeypot - rendered invisibly, real users never fill it; the backend
   * rejects any submission where it's non-empty. Permissive here so the
   * form itself never blocks on it.
   */
  website: z.string().optional(),
});

export type FarmApplicationValues = z.infer<typeof farmApplicationSchema>;

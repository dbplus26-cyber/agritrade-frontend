import { z } from "zod";
import { ENQUIRY_SUBJECTS } from "@/types/enquiry.types";

/**
 * Enquiry form schema - mirrors the backend's `enquiry-validation.ts` (same
 * rules, same messages), so the client and the office always agree on what a
 * valid enquiry is. Phone stays permissive here (never block a person over
 * punctuation) - the backend is the authority and normalizes to E.164,
 * returning a per-field error for numbers it can't parse.
 */
export const enquirySchema = z.object({
  fullName: z.string().trim().min(1, "Please enter your name.").max(150),
  phone: z
    .string()
    .trim()
    .min(1, "We need a phone number to reach you.")
    .max(20),
  email: z
    .union([z.literal(""), z.string().email("Please enter a valid email.")])
    .optional(),
  subject: z.enum(ENQUIRY_SUBJECTS),
  message: z
    .string()
    .trim()
    .min(1, "Tell us briefly what you need so the right person calls you back.")
    .max(2000),
  /**
   * Honeypot - rendered invisibly, real users never fill it; the backend
   * rejects any submission where it's non-empty. Permissive here so the form
   * itself never blocks on it.
   */
  website: z.string().optional(),
});

export type EnquiryValues = z.infer<typeof enquirySchema>;

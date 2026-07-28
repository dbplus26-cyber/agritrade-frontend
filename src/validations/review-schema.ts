import { z } from "zod";
import { REVIEW_ROLES } from "@/types/public-review.types";

/**
 * Public review form schema - mirrors the backend's `review-validation.ts`
 * `submitReviewSchema` (same bounds, friendlier messages). The
 * transaction number + phone pair is how the backend proves the reviewer is
 * a real customer; we keep both permissive here and let the server be the
 * authority (its REVIEW_NOT_VERIFIED message is shown verbatim inline).
 */
export const reviewSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(150, "Please keep your name under 150 characters."),
  phone: z
    .string()
    .trim()
    .min(6, "Enter the phone number you used on the transaction.")
    .max(20, "That phone number looks too long."),
  transactionNo: z
    .string()
    .trim()
    .min(5, "That number looks too short - check your receipt or waybill.")
    .max(24, "That number looks too long - check your receipt or waybill."),
  role: z.enum(REVIEW_ROLES),
  // The star group writes a number via setValue; 0 (nothing picked yet)
  // fails min(1) with the friendly message.
  rating: z
    .number()
    .int()
    .min(1, "Pick a star rating.")
    .max(5, "Pick a star rating."),
  text: z
    .string()
    .trim()
    .min(10, "Tell us a little more - at least a sentence.")
    .max(2000, "Please keep your review under 2000 characters."),
  /**
   * Honeypot - rendered invisibly, real users never fill it; the backend
   * rejects any submission where it's non-empty. Permissive here so the
   * form itself never blocks on it.
   */
  website: z.string().optional(),
});

export type ReviewValues = z.infer<typeof reviewSchema>;

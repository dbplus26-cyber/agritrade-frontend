import { REVIEW_MAX_CHARS, REVIEWER_NAME_MAX } from "@/lib/limits";
import { z } from "zod";
import { REVIEW_ROLES } from "@/types/public-review.types";

/**
 * Admin-recorded review (phoned in, written on paper) - mirrors the backend's
 * `review-validation.ts` `createAdminReviewSchema` (same bounds, friendlier
 * messages). No transaction verification: these publish immediately with
 * source ADMIN and never carry the verified badge. `role` is required here
 * even though the backend treats it as optional - the office always knows
 * who the reviewer was.
 */
export const adminReviewSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(2, "Enter the reviewer's name.")
    .max(
      REVIEWER_NAME_MAX,
      `Keep the name under ${String(REVIEWER_NAME_MAX)} characters.`,
    ),
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
    .min(10, "Write at least a sentence - 10 characters minimum.")
    .max(REVIEW_MAX_CHARS, `Keep the review under ${String(REVIEW_MAX_CHARS)} characters.`),
});

export type AdminReviewValues = z.infer<typeof adminReviewSchema>;

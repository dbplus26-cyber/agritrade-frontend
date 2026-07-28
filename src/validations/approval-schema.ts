import { z } from "zod";

/**
 * Mirrors the backend `decideApprovalSchema`
 * (agritrade-backend src/validations/approval-validation.ts). The note is
 * optional on approval; rejection REQUIRES it - the service enforces the
 * same rule, this just surfaces it before the round trip.
 */
export const approveFormSchema = z.object({
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters")
    .refine((v) => v.length === 0 || v.length >= 3, {
      message: "A note needs at least 3 characters",
    }),
});

export const rejectFormSchema = z.object({
  note: z
    .string()
    .trim()
    .min(3, "Say why this is rejected - the requester needs the context")
    .max(500, "Keep the note under 500 characters"),
});

/**
 * The queue's reject note. The API accepts three characters; the console asks
 * for ten. A rejection is the requester's only explanation of why their work
 * was turned back, and "no" is not one - the stricter floor is a UI decision,
 * deliberately tighter than the contract rather than a mirror of it.
 */
export const rejectNoteSchema = z.object({
  note: z
    .string()
    .trim()
    .min(10, "Say why in at least 10 characters - the requester only sees this")
    .max(500, "Keep the note under 500 characters"),
});

export type ApproveFormValues = z.infer<typeof approveFormSchema>;
export type RejectFormValues = z.infer<typeof rejectFormSchema>;
export type RejectNoteValues = z.infer<typeof rejectNoteSchema>;

import { z } from "zod";

/**
 * Mirrors the backend `cashbook-validation.ts`. The client refuses what the
 * server would refuse, and says so against the offending field rather than as
 * a banner after the round trip.
 */

/**
 * Amounts are held as STRINGS through the form and converted once on submit.
 * A number input bound to a number clamps on every keystroke, which makes the
 * field impossible to clear and rewrites a half-typed figure before the rest
 * of it can be entered.
 */
const amountText = z
  .string()
  .min(1, "Enter the amount")
  .refine(
    (v) => /^-?\d+(\.\d{1,2})?$/.test(v),
    "Amounts are recorded to 2 decimal places (pesewas)",
  )
  .refine((v) => Math.abs(Number(v)) <= 99_999_999.99, "Amount is too large");

const positiveAmount = amountText.refine(
  (v) => Number(v) > 0,
  "The amount must be more than zero",
);

/** The entry types whose direction the TYPE decides, so the figure is positive. */
export const DIRECTIONAL_ENTRY_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "CHARGE",
  "CAPITAL",
] as const;

export const accountEntrySchema = z
  .object({
    amountGhs: amountText,
    occurredAt: z.string().min(1, "Pick the date the money moved"),
    reason: z
      .string()
      .trim()
      .min(3, "Say what this entry is for")
      .max(500, "Keep it under 500 characters"),
    type: z.enum([
      "CAPITAL",
      "CHARGE",
      "CORRECTION",
      "DEPOSIT",
      "OPENING",
      "WITHDRAWAL",
    ]),
  })
  .superRefine((values, ctx) => {
    // OPENING and CORRECTION are signed on purpose: an account can start
    // overdrawn, and a correction exists to go whichever way the mistake went.
    // Everything else takes a positive figure and lets the type decide.
    const directional = (DIRECTIONAL_ENTRY_TYPES as readonly string[]).includes(
      values.type,
    );
    if (directional && Number(values.amountGhs) <= 0) {
      ctx.addIssue({
        code: "custom",
        message:
          "Enter a positive figure - whether it goes in or out is what the type above chooses.",
        path: ["amountGhs"],
      });
    }
    if (Number(values.amountGhs) === 0) {
      ctx.addIssue({
        code: "custom",
        message: "An entry cannot be for zero",
        path: ["amountGhs"],
      });
    }
  });

export const accountTransferSchema = z
  .object({
    amountGhs: positiveAmount,
    fromAccountId: z.string().min(1, "Pick the account the money leaves"),
    occurredAt: z.string().min(1, "Pick the date the money moved"),
    reason: z.string().trim().max(500).optional(),
    toAccountId: z.string().min(1, "Pick the account the money lands in"),
  })
  .refine((v) => v.fromAccountId !== v.toAccountId, {
    message: "Money cannot move from an account to itself",
    path: ["toAccountId"],
  });

export const reconcileSchema = z.object({
  asOf: z.string().min(1, "Pick the date you are proving"),
  countedBalanceGhs: amountText,
  notes: z.string().trim().max(1000).optional(),
  postCorrection: z.boolean().optional(),
});

export type AccountEntryValues = z.infer<typeof accountEntrySchema>;
export type AccountTransferValues = z.infer<typeof accountTransferSchema>;
export type ReconcileValues = z.infer<typeof reconcileSchema>;

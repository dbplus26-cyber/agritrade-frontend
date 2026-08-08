import { z } from "zod";

/**
 * Mirrors the backend `createDisbursementSchema`
 * (validations/disbursement-validation.ts). Which fields are REQUIRED depends
 * on the rail, so the refinements below reproduce the server's cross-field
 * rules - the client should refuse what the server would refuse, and say so
 * against the offending field rather than as a banner after the round trip.
 */
const amountField = z
  .string()
  .min(1, "Enter the amount")
  .refine((v) => Number(v) > 0, "The amount must be more than zero")
  .refine(
    (v) => /^\d+(\.\d{1,2})?$/.test(v),
    "Amounts are recorded to 2 decimal places (pesewas)",
  )
  // The backend's moneyField(10_000_000) ceiling, mirrored so a fat-fingered
  // amount is refused at the field instead of by a server round-trip.
  .refine((v) => Number(v) <= 10_000_000, "Amount is too large");

export const disbursementSchema = z
  .object({
    amountGhs: amountField,
    bankAccountNumber: z.string().trim().optional(),
    bankCode: z.string().optional(),
    channel: z.string().optional(),
    description: z
      .string()
      .trim()
      .min(3, "Say what this payment is for")
      .max(100, "Keep it under 100 characters - Hubtel carries it verbatim"),
    rail: z.enum(["BANK", "MOMO"]),
    recipientMsisdn: z.string().trim().optional(),
    recipientName: z
      .string()
      .trim()
      .min(2, "Enter the recipient's name")
      .max(150),
  })
  .superRefine((body, ctx) => {
    if (body.rail === "MOMO") {
      if (!body.channel) {
        ctx.addIssue({
          code: "custom",
          message: "Choose the recipient's mobile money network",
          path: ["channel"],
        });
      }
      // 233XXXXXXXXX, the international format Hubtel's rail expects. Rejected
      // here rather than at the server so a mistyped number is caught before
      // anything is committed against it.
      if (!/^233\d{9}$/.test(body.recipientMsisdn ?? "")) {
        ctx.addIssue({
          code: "custom",
          message: "Use the international format, e.g. 233249111411",
          path: ["recipientMsisdn"],
        });
      }
      return;
    }
    if (!body.bankCode) {
      ctx.addIssue({
        code: "custom",
        message: "Choose the recipient's bank",
        path: ["bankCode"],
      });
    }
    if ((body.bankAccountNumber ?? "").trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        message: "Enter the recipient's account number",
        path: ["bankAccountNumber"],
      });
    }
  });

export type DisbursementValues = z.infer<typeof disbursementSchema>;

/**
 * Mirrors `resolveDisbursementSchema`. The reason is long-form and mandatory:
 * this is a human overriding the payment rail, and the written reason IS the
 * justification the audit trail keeps.
 */
export const resolveDisbursementSchema = z.object({
  outcome: z.enum(["FAILED", "SUCCESS"]),
  reason: z
    .string()
    .trim()
    .min(10, "Say how you confirmed this - at least a sentence")
    .max(400),
});

export type ResolveDisbursementValues = z.infer<
  typeof resolveDisbursementSchema
>;

/** Mirrors the backend `createTransferSchema`. */
export const balanceTransferSchema = z.object({
  amountGhs: amountField,
  description: z
    .string()
    .trim()
    .min(3, "Say what this transfer is for")
    .max(100),
});

export type BalanceTransferValues = z.infer<typeof balanceTransferSchema>;

/** Mirrors the backend `topUpSchema` for an allocation. */
export const floatTopUpSchema = z.object({
  amountGhs: amountField,
  method: z.enum(["BANK", "CASH", "MOMO"]),
  reason: z.string().trim().max(500).optional(),
});

export type FloatTopUpValues = z.infer<typeof floatTopUpSchema>;

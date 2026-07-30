import { z } from "zod";

/**
 * Mirrors the backend `createExpenseSchema` (validations/expense-validation.ts):
 * 2dp amounts so the wire format matches the Decimal(14,2) column, and a date
 * that has already happened. Kept in step deliberately — the client should
 * refuse what the server would refuse, and say so before the round trip.
 */
export const expenseSchema = z.object({
  amountGhs: z
    .string()
    .min(1, "Enter the amount")
    .refine((v) => Number(v) > 0, "The amount must be more than zero")
    .refine(
      (v) => /^\d+(\.\d{1,2})?$/.test(v),
      "Amounts are recorded to 2 decimal places (pesewas)",
    ),
  categoryId: z.string().min(1, "Choose a category"),
  description: z.string().trim().max(500).optional(),
  incurredAt: z
    .string()
    .min(1, "Enter the date")
    .refine(
      (v) => new Date(v) <= new Date(),
      "That date is in the future - check the year",
    ),
});

export type ExpenseValues = z.infer<typeof expenseSchema>;

/**
 * Mirrors the backend `voidExpenseSchema` (validations/expense-validation.ts).
 * A wrong voucher is voided with a reason, never hard-deleted - the written
 * reason IS the correction's audit trail.
 */
export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason").max(500),
});

export type VoidExpenseValues = z.infer<typeof voidExpenseSchema>;

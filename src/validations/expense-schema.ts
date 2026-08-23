import { z } from "zod";

import {
  expensePaymentFields,
  refineExpensePayment,
} from "./expense-payment-fields";

/**
 * Mirrors the backend `createExpenseSchema` (validations/expense-validation.ts):
 * 2dp amounts so the wire format matches the Decimal(14,2) column, and a date
 * that has already happened. Kept in step deliberately - the client should
 * refuse what the server would refuse, and say so before the round trip.
 *
 * The PAYMENT half comes from expense-payment-fields, shared with the cost
 * forms on a purchase and on a trip: recording a cost and settling it across
 * two screens leaves a cost paid on the spot - which is most of them - entered
 * here and then chased on the voucher's own page, and any that is not chased
 * reads as owing money that has in fact gone out.
 *
 * Built from the accounts currently on offer, because one of those rules
 * depends on WHICH account was picked.
 */
export const makeExpenseSchema = (options?: {
  /** Accounts a named person is holding, from the settlement list. */
  heldAccountIds?: ReadonlySet<string>;
}) =>
  z
    .object({
      amountGhs: z
        .string()
        .min(1, "Enter the amount")
        .refine((v) => Number(v) > 0, "The amount must be more than zero")
        // The backend's moneyField ceiling - uncapped here, a fat-fingered
        // amount meets a raw 400 instead of a field message.
        .refine(
          (v) => Number(v) <= 10_000_000,
          "Enter an amount up to 10,000,000",
        )
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
      ...expensePaymentFields,
    })
    .superRefine((values, ctx) => {
      refineExpensePayment(values, ctx, options?.heldAccountIds);
    });

/**
 * The rules as they stand with no account list to hand: every transfer must
 * quote its reference. Strictly correct for company accounts, which is all
 * this covers - a caller that can offer held accounts builds its own schema.
 */
export const expenseSchema = makeExpenseSchema();

export type ExpenseValues = z.infer<ReturnType<typeof makeExpenseSchema>>;

/**
 * Mirrors the backend `voidExpenseSchema` (validations/expense-validation.ts).
 * A wrong voucher is voided with a reason, never hard-deleted - the written
 * reason IS the correction's audit trail.
 */
export const voidExpenseSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason").max(500),
});

export type VoidExpenseValues = z.infer<typeof voidExpenseSchema>;

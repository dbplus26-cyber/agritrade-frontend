import { z } from "zod";

/**
 * Mirrors the backend `createExpenseSchema` (validations/expense-validation.ts):
 * 2dp amounts so the wire format matches the Decimal(14,2) column, and a date
 * that has already happened. Kept in step deliberately - the client should
 * refuse what the server would refuse, and say so before the round trip.
 *
 * The last four fields are the PAYMENT half. Recording a cost and settling it
 * used to be two screens, so a cost paid on the spot - which is most of them -
 * was entered here and then chased on the voucher's own page, and any that was
 * not chased read as owing money that had in fact gone out. There is
 * deliberately no amount among them: the server settles the whole cost, and
 * asking for the same figure twice is how a part payment gets recorded by
 * accident.
 *
 * Built from the accounts currently on offer, because one of the rules depends
 * on WHICH account was picked - see the reference rule below.
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
      method: z.enum(["BANK", "CASH", "MOMO"]),
      paidNow: z.boolean(),
      paymentAccountId: z.string(),
      reference: z.string().trim().max(120),
    })
    .superRefine((values, ctx) => {
      // Cash needs neither an account nor a reference: it leaves the office
      // till, which issues no statement to reconcile against. A transfer needs
      // both, and the server refuses without them (ACCOUNT_REQUIRED,
      // REFERENCE_REQUIRED) - being told that after the round trip, on a form
      // that moves money, is the round trip worth saving.
      if (!values.paidNow || values.method === "CASH") return;
      if (!values.paymentAccountId) {
        ctx.addIssue({
          code: "custom",
          message:
            "Say where this money came from - it is what the statement is reconciled against.",
          path: ["paymentAccountId"],
        });
      }
      // A reference is the handle the office uses to match this book against a
      // statement it RECEIVES, and no statement arrives for somebody's personal
      // wallet - that is proved by a sit-down count. The server exempts a held
      // account for exactly that reason (isHeldAccount,
      // services/payment-account/payment-account-link.ts), so demanding one
      // here would refuse an entry the server would have taken, with nothing
      // the person could type to get past it.
      const heldByAPerson =
        options?.heldAccountIds?.has(values.paymentAccountId) ?? false;
      if (!values.reference && !heldByAPerson) {
        ctx.addIssue({
          code: "custom",
          message:
            "Enter the transfer reference. It is what stops this payment being recorded twice.",
          path: ["reference"],
        });
      }
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

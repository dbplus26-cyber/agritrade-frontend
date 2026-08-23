import { z } from "zod";

/**
 * The PAYMENT half of any form that records a cost: was it paid, how, out of
 * which account, and against which reference.
 *
 * Three forms ask it - the standalone expense, a cost on a purchase, a cost on
 * a trip - and they must ask it identically. The rules are not obvious (cash
 * needs no account, a transfer needs a reference unless the account is
 * somebody's own pocket), and a form that guesses one of them differently
 * refuses an entry the server would have taken, or lets one through that it
 * will not.
 *
 * There is deliberately no amount here: the server settles the whole cost, and
 * asking for the same figure twice is how a part payment gets recorded by
 * accident. A part payment is made from the voucher, where the outstanding
 * balance is on screen.
 */
export const expensePaymentFields = {
  method: z.enum(["BANK", "CASH", "MOMO"]),
  paidNow: z.boolean(),
  paymentAccountId: z.string(),
  reference: z.string().trim().max(120),
};

/** The shape those fields parse to, for a form's values type. */
export interface ExpensePaymentValues {
  method: "BANK" | "CASH" | "MOMO";
  paidNow: boolean;
  paymentAccountId: string;
  reference: string;
}

/**
 * The cross-field rules, applied by every form that carries the fields above.
 *
 * `heldAccountIds` are the accounts a named person is holding. The office
 * receives no statement for somebody's personal wallet - that is proved by a
 * sit-down count - so the server exempts them from the reference rule
 * (isHeldAccount, services/payment-account/payment-account-link.ts), and
 * demanding one here would refuse an entry with nothing the person could type
 * to get past it.
 */
export const refineExpensePayment = (
  values: ExpensePaymentValues,
  ctx: z.RefinementCtx,
  heldAccountIds?: ReadonlySet<string>,
): void => {
  // Cash needs neither an account nor a reference: it leaves the office till,
  // which issues no statement to reconcile against.
  if (!values.paidNow || values.method === "CASH") return;
  if (!values.paymentAccountId) {
    ctx.addIssue({
      code: "custom",
      message:
        "Say where this money came from - it is what the statement is reconciled against.",
      path: ["paymentAccountId"],
    });
  }
  const heldByAPerson = heldAccountIds?.has(values.paymentAccountId) ?? false;
  if (!values.reference && !heldByAPerson) {
    ctx.addIssue({
      code: "custom",
      message:
        "Enter the transfer reference. It is what stops this payment being recorded twice.",
      path: ["reference"],
    });
  }
};

/** The payment block a request body carries, or nothing when it is owed. */
export interface ExpensePaymentBody {
  method: "BANK" | "CASH" | "MOMO";
  paidAt: string;
  paymentAccountId?: string;
  reference?: string;
}

/**
 * The payment half of the request, built the one way.
 *
 * `paidAt` is the day the cost was RUN UP, not today: a voucher written up on
 * Monday for Friday's fuel was paid on Friday, and dating it now would put the
 * money in the wrong week of the cash book.
 */
export const expensePaymentBody = (
  values: ExpensePaymentValues & { incurredAt: string },
): ExpensePaymentBody | undefined =>
  values.paidNow
    ? {
        method: values.method,
        paidAt: values.incurredAt,
        ...(values.paymentAccountId
          ? { paymentAccountId: values.paymentAccountId }
          : {}),
        ...(values.reference ? { reference: values.reference } : {}),
      }
    : undefined;

/**
 * Which field a refused payment belongs to. The server checks these after the
 * form has already let the submission through - a retired account, an account
 * that cannot carry the method - and a toast about it leaves the reader
 * hunting for which of six fields to change.
 */
export const PAYMENT_FIELD_FOR_CODE: Record<
  string,
  "paymentAccountId" | "reference"
> = {
  ACCOUNT_METHOD_MISMATCH: "paymentAccountId",
  ACCOUNT_NOT_SETTLEABLE: "paymentAccountId",
  ACCOUNT_REQUIRED: "paymentAccountId",
  ACCOUNT_RETIRED: "paymentAccountId",
  DUPLICATE_REFERENCE: "reference",
  REFERENCE_REQUIRED: "reference",
};

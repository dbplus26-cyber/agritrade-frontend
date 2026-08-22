import { z } from "zod";

/**
 * Float form schemas, mirroring the backend
 * `src/validations/float-validation.ts`. Amounts stay strings in the form
 * and convert at submit.
 */

const amountField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .refine((v) => Number(v) > 0 && Number(v) <= 10_000_000, {
      message: "Enter an amount between 0 and 10,000,000",
    });

const optionalText = (max: number) =>
  z.string().trim().max(max).or(z.literal("")).optional();

/**
 * Handing somebody money to spend for the business.
 *
 * `fromAccountId` is required: money in an agent's hands came out of a company
 * account, and saying which one is what turns a bare credit into a transfer.
 * `toKind` says where it landed - notes in their pocket, their own wallet,
 * their bank - because those are different money, and one number covering all
 * three makes an agent's position unreadable.
 */
export const topUpSchema = z.object({
  amountGhs: amountField("top-up amount"),
  fromAccountId: z.string().min(1, "Say which account the money came out of"),
  reason: optionalText(500),
  toKind: z.enum(["CASH", "MOMO", "BANK"]),
});
export type TopUpValues = z.infer<typeof topUpSchema>;

/** The sit-down count: zero is a legal counted amount. */
export const reconcileSchema = z.object({
  countedGhs: z
    .string()
    .trim()
    .min(1, "Enter the counted cash")
    .refine((v) => Number(v) >= 0 && Number(v) <= 10_000_000, {
      message: "Enter an amount between 0 and 10,000,000",
    }),
  notes: optionalText(1000),
});
export type ReconcileValues = z.infer<typeof reconcileSchema>;

/**
 * Agent field expense (porters, offloading, airtime on the road).
 *
 * `purchaseId` and `treatment` are the optional attribution: an empty
 * `purchaseId` means an ordinary field cost, and `treatment` only matters
 * once a purchase is named. Both are optional at the schema level so a draft
 * saved on the phone before either existed still loads.
 */
export const agentExpenseSchema = z.object({
  categoryId: z.string().min(1, "Choose the expense category"),
  purchaseId: z.string().optional(),
  treatment: z.enum(["goods", "month"]).optional(),
  amountGhs: amountField("amount"),
  description: optionalText(500),
  incurredAt: z.string().min(1, "Enter the expense date"),
});
export type AgentExpenseValues = z.infer<typeof agentExpenseSchema>;

/**
 * What somebody may SEND, which is not what they are holding.
 *
 * Blank clears the cap rather than meaning zero: "no limit" and "may not send
 * a pesewa" are opposite statements, and a form that turned an emptied box
 * into a zero would silently suspend somebody. The server refuses a zero
 * outright for the same reason - that is what the suspend switch is for.
 */
export const sendLimitSchema = z.object({
  capGhs: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (Number(v) > 0 && /^\d+(\.\d{1,2})?$/.test(v)),
      "Enter an amount above zero, or leave it blank for no limit",
    ),
});
export type SendLimitValues = z.infer<typeof sendLimitSchema>;

/**
 * The one form behind "Give money", across all three things that phrase can
 * mean. Which fields matter depends on `mode`, so the cross-field rules live
 * here rather than in three near-identical schemas:
 *
 *   CASH    - notes out of the office till. No account to pick: the till is
 *             resolved by name, and their cash account is opened on demand.
 *   ECASH   - a transfer, so it must say which company account it left.
 *   SPEND   - permission, not money. Only the cap applies, and blank means
 *             uncapped rather than nothing.
 */
export const giveMoneySchema = z
  .object({
    amountGhs: z.string().trim(),
    capGhs: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (Number(v) > 0 && /^\d+(\.\d{1,2})?$/.test(v)),
        "Enter an amount above zero, or leave it blank for no limit",
      ),
    fromAccountId: z.string(),
    mode: z.enum(["CASH", "ECASH", "SPEND"]),
    reason: optionalText(500),
    toKind: z.enum(["MOMO", "BANK"]),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "SPEND") return;
    if (!/^\d+(\.\d{1,2})?$/.test(v.amountGhs) || Number(v.amountGhs) <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "Enter an amount above zero",
        path: ["amountGhs"],
      });
    }
    // Only the transfer needs a source named. Cash always leaves the till, and
    // making the owner pick it off a list is how the wrong cash-looking
    // account eventually gets chosen.
    if (v.mode === "ECASH" && !v.fromAccountId) {
      ctx.addIssue({
        code: "custom",
        message: "Say which account the money is going out of",
        path: ["fromAccountId"],
      });
    }
  });
export type GiveMoneyValues = z.infer<typeof giveMoneySchema>;

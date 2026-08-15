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

/** Owner cash to an agent. */
/**
 * Handing somebody money to spend for the business.
 *
 * `fromAccountId` is required: money in an agent's hands came out of a company
 * account, and saying which one is what turns a bare credit into a transfer.
 * `toKind` says where it landed - notes in their pocket, their own wallet,
 * their bank - because those are different money and one number for all three
 * is what made an agent's position unreadable.
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

/** Agent field expense (porters, offloading, airtime on the road). */
export const agentExpenseSchema = z.object({
  categoryId: z.string().min(1, "Choose the expense category"),
  amountGhs: amountField("amount"),
  description: optionalText(500),
  incurredAt: z.string().min(1, "Enter the expense date"),
});
export type AgentExpenseValues = z.infer<typeof agentExpenseSchema>;

import { z } from "zod";

/**
 * Payment-account form schema, mirroring the backend validation in
 * agritrade-backend `src/validations/payment-account-validation.ts` so the
 * client rejects the same input the server would. Optional text fields accept
 * "" here; the submit handlers omit empty values (create) or send null (edit
 * clears).
 */

const optionalText = (max: number) =>
  z.string().trim().max(max).or(z.literal("")).optional();

export const paymentAccountKinds = ["BANK", "MOMO", "CASH", "OTHER"] as const;

/**
 * The kind-specific rules match the server's: a bank account is useless
 * without the bank named, and a MoMo wallet without the network sends the
 * payer to the wrong menu. Both are checked here so the form can point at the
 * field rather than surfacing a server error at the top of the page.
 */
export const paymentAccountSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(2, "Give it a name you will recognise")
      .max(120),
    kind: z.enum(paymentAccountKinds),
    accountName: z
      .string()
      .trim()
      .min(2, "Enter the name the money must be sent to")
      .max(150),
    accountNumber: z
      .string()
      .trim()
      .min(3, "Enter the account or wallet number")
      .max(60),
    bankName: optionalText(120),
    branch: optionalText(120),
    sortCode: optionalText(40),
    swiftCode: optionalText(20),
    provider: optionalText(60),
    instructions: optionalText(500),
    isActive: z.boolean(),
    showOnInvoice: z.boolean(),
    // Registered with `valueAsNumber`, so this receives a real number - a
    // coerced schema would leave the resolver's input type unknown.
    sortOrder: z.number().int().min(0).max(9999),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "BANK" && !value.bankName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Name the bank - it is the first thing a payer is asked for",
        path: ["bankName"],
      });
    }
    if (value.kind === "MOMO" && !value.provider?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Name the network (MTN, Telecel, AT)",
        path: ["provider"],
      });
    }
  });

export type PaymentAccountFormValues = z.infer<typeof paymentAccountSchema>;

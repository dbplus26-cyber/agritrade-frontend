import { z } from "zod";

/**
 * Sale form schemas, mirroring the backend
 * `src/validations/sale-validation.ts`. Numbers stay strings in the form (so a
 * field can be emptied while typing) and convert at submit; the server
 * recomputes the agreed total regardless of what the client sends.
 */

const requiredNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .refine((v) => Number(v) > 0 && Number(v) <= max, {
      message: `Enter a ${label} between 0 and ${max.toLocaleString("en-GH")}`,
    });

// The backend caps a sale line's price per kg at 10,000 GHS. Keep this in
// step with it: a looser client cap just lets the form submit a value the
// server rejects raw, so the trader gets a generic 400 instead of the field
// error that would have told them what is wrong.
const MAX_UNIT_PRICE_GHS = 10_000;

const lineSchema = z.object({
  commodityId: z.string().min(1, "Choose the commodity"),
  weightKg: requiredNumber("weight in kg", 1_000_000),
  unitPriceGhs: requiredNumber("price per kg", MAX_UNIT_PRICE_GHS),
});

export const saleSchema = z.object({
  buyerId: z.string().min(1, "Choose the buyer"),
  paymentPolicyId: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one line"),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export const recordPaymentSchema = z.object({
  amountGhs: requiredNumber("amount", 100_000_000),
  method: z.enum(["CASH", "MOMO", "BANK"]),
  reference: z.string().trim().max(120).or(z.literal("")).optional(),
  paidAt: z.string().optional(),
});

export const cancelSaleSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason").max(500),
});

export type CancelSaleValues = z.infer<typeof cancelSaleSchema>;
export type RecordPaymentValues = z.infer<typeof recordPaymentSchema>;
export type SaleValues = z.infer<typeof saleSchema>;

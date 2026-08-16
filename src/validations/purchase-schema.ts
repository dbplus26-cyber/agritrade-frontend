import { z } from "zod";
import { PurchaseSource } from "@/types/registry.types";

/**
 * Purchase form schemas, mirroring the backend
 * `src/validations/purchase-validation.ts`. Weights and prices stay strings
 * in the form (so fields can be emptied while typing) and are converted at
 * submit; the server recomputes the total regardless.
 */

const requiredNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .refine((v) => Number(v) > 0 && Number(v) <= max, {
      message: `Enter a ${label} between 0 and ${max.toLocaleString("en-GH")}`,
    });

const optionalText = (max: number) =>
  z.string().trim().max(max).or(z.literal("")).optional();

/** Admin create; the agent picker is required when source is AGENT. */
export const purchaseSchema = z
  .object({
    source: z.enum(PurchaseSource),
    commodityId: z.string().min(1, "Choose the commodity"),
    supplierId: z.string().optional(),
    agentProfileId: z.string().optional(),
    warehouseId: z.string().optional(),
    weightKg: requiredNumber("weight in kg", 1_000_000),
    unitPriceGhs: requiredNumber("price per kg", 1_000_000),
    purchasedAt: z.string().min(1, "Enter the purchase date"),
    notes: optionalText(1000),
  })
  .refine(
    (v) => v.source !== PurchaseSource.AGENT || Boolean(v.agentProfileId),
    {
      message: "Choose the agent whose float paid for this purchase",
      path: ["agentProfileId"],
    },
  );
export type PurchaseValues = z.infer<typeof purchaseSchema>;

/** The agent's own field form (source and float are forced server-side). */
export const agentPurchaseSchema = z.object({
  commodityId: z.string().min(1, "Choose the commodity"),
  supplierId: z.string().optional(),
  weightKg: requiredNumber("weight in kg", 1_000_000),
  unitPriceGhs: requiredNumber("price per kg", 1_000_000),
  purchasedAt: z.string().min(1, "Enter the purchase date"),
  /**
   * Whether the money changed hands at the scale.
   *
   * Recording a purchase used to charge the agent's float by itself, so the
   * two were the same act and a farmer paid at the weekend had nowhere to be
   * recorded. Defaults to yes because cash at the scale IS the ordinary field
   * case - the convenience belongs in the form, not silently in the model.
   */
  paidNow: z.boolean(),
  paymentMethod: z.enum(["CASH", "MOMO"]),
  notes: optionalText(1000),
});
export type AgentPurchaseValues = z.infer<typeof agentPurchaseSchema>;

export const receivePurchaseSchema = z.object({
  receivedKg: requiredNumber("received weight in kg", 1_000_000),
  warehouseId: z.string().min(1, "Choose the receiving warehouse"),
  receivedAt: z.string().optional(),
});
export type ReceivePurchaseValues = z.infer<typeof receivePurchaseSchema>;

/**
 * A cost incurred to acquire one purchase's goods. Mirrors the backend
 * `purchaseExpenseSchema`.
 *
 * `capitalise` carries no default even though the server has one. It decides
 * whether the cost rides on the goods to cost of sales or lands in this
 * month's costs, it cannot be changed afterwards, and a form that submits
 * without an answer has made that call for whoever filled it in.
 */
export const purchaseCostSchema = z.object({
  amountGhs: z
    .string()
    .trim()
    .min(1, "Enter the amount")
    .refine((v) => Number(v) > 0, "The amount must be more than zero")
    .refine(
      (v) => Number(v) <= 10_000_000,
      "That is larger than any single cost the system takes - check the figure",
    )
    .refine(
      (v) => /^\d+(\.\d{1,2})?$/.test(v),
      "Amounts are recorded to 2 decimal places (pesewas)",
    ),
  capitalise: z.boolean(),
  categoryId: z.string().min(1, "Choose a category"),
  description: optionalText(500),
  incurredAt: z
    .string()
    .min(1, "Enter the date")
    .refine(
      (v) => new Date(v) <= new Date(),
      "That date is in the future - check the year",
    ),
});
export type PurchaseCostValues = z.infer<typeof purchaseCostSchema>;

export const voidPurchaseSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Say why this purchase is being voided")
    .max(500),
});
export type VoidPurchaseValues = z.infer<typeof voidPurchaseSchema>;

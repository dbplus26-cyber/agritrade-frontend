import { z } from "zod";

/**
 * Shipment form schemas, mirroring the backend
 * `src/validations/shipment-validation.ts`. Numbers stay strings in the form
 * and convert at submit.
 */

const optionalWeight = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || (Number(v) > 0 && Number(v) <= 1_000_000), {
    message: "Enter a weight between 0 and 1,000,000",
  });

export const shipmentSchema = z.object({
  saleId: z.string().min(1, "Choose the sale"),
  originWarehouseId: z.string().min(1, "Choose the origin warehouse"),
  destination: z.string().trim().min(1, "Enter the destination").max(200),
  truckReg: z.string().trim().min(1, "Enter the truck registration").max(40),
  driverName: z.string().trim().min(1, "Enter the driver's name").max(120),
  driverPhone: z.string().trim().max(20).or(z.literal("")).optional(),
  truckCapacityKg: optionalWeight,
  expectedArrivalAt: z.string().optional(),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export const shipmentExpenseSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  amountGhs: z
    .string()
    .trim()
    .min(1, "Enter the amount")
    .refine((v) => Number(v) > 0 && Number(v) <= 100_000_000, {
      message: "Enter a valid amount",
    }),
  description: z.string().trim().max(500).or(z.literal("")).optional(),
});

export const cancelShipmentSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason").max(500),
});

export type CancelShipmentValues = z.infer<typeof cancelShipmentSchema>;
export type ShipmentExpenseValues = z.infer<typeof shipmentExpenseSchema>;
export type ShipmentValues = z.infer<typeof shipmentSchema>;

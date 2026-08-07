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

export const shipmentSchema = z
  .object({
    saleIds: z.array(z.string()).min(1, "Choose at least one sale"),
    originWarehouseId: z.string().min(1, "Choose the origin warehouse"),
    /** Further sheds the truck also calls at; the origin is always included. */
    loadingWarehouseIds: z
      .array(z.string())
      .max(10, "A trip can call at 10 warehouses at most")
      .optional(),
    /** A saved delivery address; "" means "enter the destination manually". */
    deliveryAddressId: z.string().optional(),
    /** Required only when no saved address is chosen (backend contract). */
    destination: z.string().trim().max(200).or(z.literal("")).optional(),
    truckReg: z.string().trim().min(1, "Enter the truck registration").max(40),
    /** A drivers-directory record; "" means "enter details manually". */
    driverId: z.string().optional(),
    /** Required unless a directory driver backfills the snapshot. */
    driverName: z.string().trim().max(120).or(z.literal("")).optional(),
    driverPhone: z
      .string()
      .trim()
      .min(6, "Enter a full phone number")
      .max(20)
      .or(z.literal(""))
      .optional(),
    driverEmail: z
      .email("Enter a valid email")
      .max(255)
      .or(z.literal(""))
      .optional(),
    driverCompany: z.string().trim().max(150).or(z.literal("")).optional(),
    driverCity: z.string().trim().max(120).or(z.literal("")).optional(),
    driverLicenseNo: z.string().trim().max(50).or(z.literal("")).optional(),
    driverIdNumber: z.string().trim().max(50).or(z.literal("")).optional(),
    truckCapacityKg: optionalWeight,
    expectedArrivalAt: z.string().optional(),
    notes: z.string().trim().max(1000).or(z.literal("")).optional(),
  })
  .superRefine((values, ctx) => {
    // Mirrors the backend: destination is optional only with a saved address;
    // driverName/driverPhone are required unless a directory driver is given.
    if (!values.deliveryAddressId && !values.destination?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["destination"],
        message: "Enter the destination",
      });
    }
    if (!values.driverId) {
      if (!values.driverName?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["driverName"],
          message: "Enter the driver's name",
        });
      }
      if (!values.driverPhone?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["driverPhone"],
          message: "Enter the driver's phone number",
        });
      }
    }
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

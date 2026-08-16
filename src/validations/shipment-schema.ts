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

/**
 * What was actually received off the truck, per commodity.
 *
 * Zero is legitimate and blank is not, and the difference is the whole point:
 * a blank means nobody has answered yet, and coercing it to zero would write
 * the entire load off as never arrived. Below zero is refused because no scale
 * reads a negative weight.
 */
const receivedKgField = z
  .string()
  .trim()
  .min(1, "Enter the weight received")
  .refine((v) => Number.isFinite(Number(v)), {
    message: "Enter the weight in kilograms",
  })
  .refine((v) => Number(v) >= 0, {
    message: "A received weight cannot be negative",
  })
  .refine((v) => Number(v) <= 100_000_000, {
    message: "That weight is too large",
  });

/**
 * What the buyer will actually pay. Entered rather than computed: received x
 * agreed price is only the SUGGESTION, and the two sides often settle on a
 * round figure after arguing about a wet load. Zero is legitimate - a delivery
 * refused outright is settled at nothing.
 */
const settledTotalField = z
  .string()
  .trim()
  .min(1, "Enter the payment to expect")
  .refine((v) => Number.isFinite(Number(v)), {
    message: "Enter the amount in cedis",
  })
  .refine((v) => Number(v) >= 0, {
    message: "A payment to expect cannot be negative",
  })
  .refine((v) => Number(v) <= 100_000_000, {
    message: "That amount is too large",
  })
  // The API's money columns are Decimal(2), so a third decimal is refused at
  // the boundary with a message about `multipleOf`. Say it here instead.
  .refine((v) => Number.isInteger(Math.round(Number(v) * 1000) / 10), {
    message: "Amounts are recorded to 2 decimal places (pesewas)",
  });

/**
 * Recording what came off the truck, mirroring the backend's
 * `arriveShipmentSchema`. `sales` may be empty: a trip can be marked arrived
 * before anybody has weighed it, because the load is on the ground either way
 * and refusing to record that would leave the register saying the truck is
 * still on the road.
 */
export const arriveShipmentSchema = z.object({
  sales: z
    .array(
      z.object({
        lines: z
          .array(
            z.object({
              commodityId: z.string().min(1),
              receivedKg: receivedKgField,
            }),
          )
          .min(1, "Say what was received"),
        saleId: z.string().min(1),
        settledTotalGhs: settledTotalField,
      }),
    )
    .optional(),
});

export type ArriveShipmentValues = z.infer<typeof arriveShipmentSchema>;
export type CancelShipmentValues = z.infer<typeof cancelShipmentSchema>;
export type ShipmentExpenseValues = z.infer<typeof shipmentExpenseSchema>;
export type ShipmentValues = z.infer<typeof shipmentSchema>;

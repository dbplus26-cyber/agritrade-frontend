import { z } from "zod";

/**
 * Mirrors the backend `createTransferSchema`
 * (agritrade-backend stock-validation): both warehouses required and
 * different, a positive weight, optional occurred date and notes. The
 * same-warehouse rule is checked client-side too so the mistake reads on the
 * field, not as a round-trip error.
 */
export const transferFormSchema = z
  .object({
    fromWarehouseId: z.string().min(1, "Choose the source warehouse"),
    toWarehouseId: z.string().min(1, "Choose the destination warehouse"),
    commodityId: z.string().min(1, "Choose a commodity"),
    weightKg: z
      .string()
      .trim()
      .min(1, "Enter the weight to move")
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: "Enter a weight above zero",
      })
      .refine((v) => Number(v) <= 1_000_000, { message: "Transfer too large" }),
    occurredAt: z.string().or(z.literal("")).optional(),
    notes: z
      .string()
      .trim()
      .max(500, "Keep notes under 500 characters")
      .or(z.literal(""))
      .optional(),
  })
  .refine(
    (v) =>
      !v.fromWarehouseId ||
      !v.toWarehouseId ||
      v.fromWarehouseId !== v.toWarehouseId,
    {
      message: "Source and destination must be different warehouses",
      path: ["toWarehouseId"],
    },
  );

export type TransferFormValues = z.infer<typeof transferFormSchema>;

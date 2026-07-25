import { z } from "zod";

const posNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .refine((v) => Number(v) > 0 && Number(v) <= max, {
      message: `Enter a valid ${label}`,
    });

const optNumber = (max: number) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (Number(v) > 0 && Number(v) <= max), {
      message: "Enter a valid amount",
    });

export const plotSchema = z.object({
  reference: z.string().trim().min(1, "Enter a reference").max(40),
  locationText: z.string().trim().min(1, "Enter the location").max(200),
  sizeText: z.string().trim().min(1, "Enter the size").max(120),
  askingPriceGhs: posNumber("asking price", 100_000_000),
  use: z.string().trim().max(60).or(z.literal("")).optional(),
  sizeAcres: optNumber(1_000_000),
  purchaseCostGhs: optNumber(100_000_000),
  description: z.string().trim().max(2000).or(z.literal("")).optional(),
  showPriceOnWebsite: z.boolean(),
});

export const landSaleSchema = z.object({
  plotId: z.string().min(1, "Choose the plot"),
  buyerId: z.string().min(1, "Choose the buyer"),
  agreedPriceGhs: posNumber("agreed price", 100_000_000),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export const landPaymentSchema = z.object({
  amountGhs: posNumber("amount", 100_000_000),
  method: z.enum(["CASH", "MOMO", "BANK"]),
  reference: z.string().trim().max(120).or(z.literal("")).optional(),
  paidAt: z.string().optional(),
});

export const cancelLandSaleSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason").max(500),
});

export const landSellerSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(150),
  phone: z.string().trim().max(20).or(z.literal("")).optional(),
  community: z.string().trim().max(120).or(z.literal("")).optional(),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export const landAcquisitionSchema = z.object({
  reference: z.string().trim().min(2, "Enter a register code").max(40),
  sellerId: z.string().min(1, "Choose the seller"),
  locationText: z.string().trim().min(2, "Enter the location").max(200),
  sizeText: z.string().trim().min(1, "Enter the size").max(120),
  agreedCostGhs: posNumber("agreed cost", 100_000_000),
  sizeAcres: optNumber(1_000_000),
  use: z.string().trim().max(60).or(z.literal("")).optional(),
  description: z.string().trim().max(2000).or(z.literal("")).optional(),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export type CancelLandSaleValues = z.infer<typeof cancelLandSaleSchema>;
export type LandAcquisitionValues = z.infer<typeof landAcquisitionSchema>;
export type LandPaymentValues = z.infer<typeof landPaymentSchema>;
export type LandSaleValues = z.infer<typeof landSaleSchema>;
export type LandSellerValues = z.infer<typeof landSellerSchema>;
export type PlotValues = z.infer<typeof plotSchema>;

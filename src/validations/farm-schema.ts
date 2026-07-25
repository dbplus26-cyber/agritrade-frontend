import { z } from "zod";

const posNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .refine((v) => Number(v) > 0 && Number(v) <= max, {
      message: `Enter a valid ${label}`,
    });

const optNonNegNumber = (max: number) =>
  z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= max), {
      message: "Enter a valid amount",
    });

export const seasonSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(120),
  startsOn: z.string().min(1, "Choose a start date"),
  endsOn: z.string().or(z.literal("")).optional(),
});

export const inputItemSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  unitLabel: z.string().trim().min(1, "Enter a unit (e.g. bag)").max(40),
});

export const farmerSchema = z.object({
  name: z.string().trim().min(1, "Enter the farmer's name").max(150),
  phone: z.string().trim().max(30).or(z.literal("")).optional(),
  community: z.string().trim().max(120).or(z.literal("")).optional(),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export const grantSchema = z.object({
  farmerId: z.string().min(1, "Choose the farmer"),
  seasonId: z.string().min(1, "Choose the season"),
  itemId: z.string().min(1, "Choose the input item"),
  quantity: posNumber("quantity", 10_000_000),
  valueGhs: posNumber("value", 100_000_000),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
});

export const repaymentSchema = z.object({
  farmerId: z.string().min(1, "Choose the farmer"),
  seasonId: z.string().min(1, "Choose the season"),
  commodityId: z.string().min(1, "Choose the commodity"),
  weightKg: posNumber("weight", 1_000_000),
  ratePerKgGhs: posNumber("rate", 100_000_000),
  intakeWarehouseId: z.string().or(z.literal("")).optional(),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
});

export const planSchema = z.object({
  expectedYieldKg: optNonNegNumber(10_000_000),
  expectedReturnGhs: optNonNegNumber(100_000_000),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export type FarmerValues = z.infer<typeof farmerSchema>;
export type GrantValues = z.infer<typeof grantSchema>;
export type InputItemValues = z.infer<typeof inputItemSchema>;
export type PlanValues = z.infer<typeof planSchema>;
export type RepaymentValues = z.infer<typeof repaymentSchema>;
export type SeasonValues = z.infer<typeof seasonSchema>;

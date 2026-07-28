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
  description: z.string().trim().max(500).or(z.literal("")).optional(),
  startsOn: z.string().min(1, "Choose a start date"),
  endsOn: z.string().or(z.literal("")).optional(),
});

export const inputItemSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  unitLabel: z.string().trim().min(1, "Enter a unit (e.g. bag)").max(40),
  description: z.string().trim().max(500).or(z.literal("")).optional(),
});

/** Mirrors backend `createFarmerSchema` (farm-validation.ts). */
export const farmerSchema = z.object({
  name: z.string().trim().min(1, "Enter the farmer's name").max(150),
  phone: z.string().trim().max(30).or(z.literal("")).optional(),
  community: z.string().trim().max(120).or(z.literal("")).optional(),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
  address: z.string().trim().max(300).or(z.literal("")).optional(),
  idType: z.string().trim().max(40).or(z.literal("")).optional(),
  idNumber: z.string().trim().max(50).or(z.literal("")).optional(),
  dateOfBirth: z.string().or(z.literal("")).optional(),
  nextOfKinName: z.string().trim().max(150).or(z.literal("")).optional(),
  nextOfKinPhone: z.string().trim().max(30).or(z.literal("")).optional(),
  farmLocation: z.string().trim().max(200).or(z.literal("")).optional(),
  farmSizeAcres: z
    .string()
    .trim()
    .refine((v) => !v || (Number(v) >= 0 && Number(v) <= 100_000), {
      message: "Enter a valid farm size in acres",
    })
    .optional(),
  momoNumber: z.string().trim().max(30).or(z.literal("")).optional(),
});

/** Mirrors backend `createGuarantorSchema` (farm-validation.ts). */
export const guarantorSchema = z.object({
  name: z.string().trim().min(1, "Enter the guarantor's name").max(150),
  phone: z.string().trim().max(30).or(z.literal("")).optional(),
  address: z.string().trim().max(300).or(z.literal("")).optional(),
  relationship: z.string().trim().max(80).or(z.literal("")).optional(),
  idType: z.string().trim().max(40).or(z.literal("")).optional(),
  idNumber: z.string().trim().max(50).or(z.literal("")).optional(),
  occupation: z.string().trim().max(120).or(z.literal("")).optional(),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
});

/** Mirrors backend `createGrantSchema` - the signed agreement file is
 * validated separately (it rides as the multipart `agreement` part). */
export const grantSchema = z.object({
  farmerId: z.string().min(1, "Choose the farmer"),
  seasonId: z.string().min(1, "Choose the season"),
  itemId: z.string().min(1, "Choose the input item"),
  quantity: posNumber("quantity", 10_000_000),
  valueGhs: posNumber("value", 100_000_000),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
  agreedTerms: z.string().trim().max(1000).or(z.literal("")).optional(),
  dueDate: z.string().or(z.literal("")).optional(),
});

/** Mirrors backend `createRepaymentSchema` - the signed receipt file is
 * validated separately (it rides as the multipart `receipt` part). */
export const repaymentSchema = z.object({
  farmerId: z.string().min(1, "Choose the farmer"),
  seasonId: z.string().min(1, "Choose the season"),
  commodityId: z.string().min(1, "Choose the commodity"),
  weightKg: posNumber("weight", 1_000_000),
  ratePerKgGhs: posNumber("rate", 100_000_000),
  intakeWarehouseId: z.string().or(z.literal("")).optional(),
  notes: z.string().trim().max(500).or(z.literal("")).optional(),
  receivedByName: z.string().trim().max(150).or(z.literal("")).optional(),
});

export const planSchema = z.object({
  expectedYieldKg: optNonNegNumber(10_000_000),
  expectedReturnGhs: optNonNegNumber(100_000_000),
  notes: z.string().trim().max(1000).or(z.literal("")).optional(),
});

export type FarmerValues = z.infer<typeof farmerSchema>;
export type GrantValues = z.infer<typeof grantSchema>;
export type GuarantorValues = z.infer<typeof guarantorSchema>;
export type InputItemValues = z.infer<typeof inputItemSchema>;
export type PlanValues = z.infer<typeof planSchema>;
export type RepaymentValues = z.infer<typeof repaymentSchema>;
export type SeasonValues = z.infer<typeof seasonSchema>;

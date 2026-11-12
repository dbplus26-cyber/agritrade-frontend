import {
  BUYER_NAME_MAX,
  COMMODITY_DESCRIPTION_MAX,
  COMMODITY_NAME_MAX,
} from "@/lib/limits";
import { z } from "zod";
import { PurchaseSource } from "@/types/registry.types";

/**
 * Registry form schemas, mirroring the backend validations in
 * agritrade-backend `src/validations/{commodity,warehouse,supplier,buyer,
 * expense-category}-validation.ts` so the client rejects the same input the
 * server would. Optional text fields accept "" here and the submit handlers
 * omit empty values (create) or send null (edit clears).
 */

const optionalText = (max: number) =>
  z.string().trim().max(max).or(z.literal("")).optional();

/** Backend: min 6 / max 20; "" means "not provided". */
const phoneField = z
  .string()
  .trim()
  .min(6, "Enter a full phone number")
  .max(20)
  .or(z.literal(""))
  .optional();

/** A percentage kept as a string so the field can be emptied while typing. */
const optionalPercent = z
  .string()
  .trim()
  .refine(
    (v) =>
      v === "" ||
      (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
    { message: "Enter a percentage between 0 and 100, to 2 decimal places" },
  )
  .optional();

export const commoditySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the commodity name")
    .max(
      COMMODITY_NAME_MAX,
      `Keep the name under ${String(COMMODITY_NAME_MAX)} characters - the variety and grade have their own fields.`,
    ),
  variety: optionalText(100),
  qualityGrade: optionalText(50),
  description: optionalText(COMMODITY_DESCRIPTION_MAX),
  sortOrder: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0),
      { message: "Enter a whole number" },
    )
    .optional(),
});

/**
 * The book settings for one commodity: its bag size and the two FM rules, one
 * for buying (what a supplier is paid on) and one for selling (what a buyer
 * pays on). Strings, so a field can be emptied; empty switches that off.
 */
export const bookSettingsSchema = z
  .object({
    bagWeightKg: z
      .string()
      .trim()
      .refine((v) => v === "" || (Number(v) > 0 && Number(v) <= 1000), {
        message: "Enter a weight between 0 and 1000 kg",
      })
      .optional(),
    fmStandardPct: optionalPercent,
    fmTolerancePct: optionalPercent,
    saleFmStandardPct: optionalPercent,
    saleFmTolerancePct: optionalPercent,
  })
  // An FM rule only works as a pair: the tolerance triggers the deduction and
  // the standard is what the excess is measured from. Mirrors the backend's
  // commodity service, which refuses the same two states (FM_RULE_INVALID).
  .superRefine((v, ctx) => {
    for (const [standardKey, toleranceKey] of [
      ["fmStandardPct", "fmTolerancePct"],
      ["saleFmStandardPct", "saleFmTolerancePct"],
    ] as const) {
      const standard = v[standardKey]?.trim() ?? "";
      const tolerance = v[toleranceKey]?.trim() ?? "";
      if (tolerance === "") continue;
      if (standard === "") {
        ctx.addIssue({
          code: "custom",
          message: "Enter the standard too, or leave both empty",
          path: [toleranceKey],
        });
      } else if (Number(tolerance) < Number(standard)) {
        ctx.addIssue({
          code: "custom",
          message: "The tolerance cannot be below the standard",
          path: [toleranceKey],
        });
      }
    }
  });
export type BookSettingsValues = z.infer<typeof bookSettingsSchema>;
export type CommodityValues = z.infer<typeof commoditySchema>;

export const warehouseSchema = z.object({
  name: z.string().trim().min(2, "Enter the warehouse name").max(100),
  description: optionalText(500),
  location: optionalText(200),
});
export type WarehouseValues = z.infer<typeof warehouseSchema>;

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Enter the supplier's name").max(150),
  phone: phoneField,
  /** A second line reaching the same person - two networks is the norm here. */
  altPhone: phoneField,
  community: optionalText(120),
  sourceType: z.enum(PurchaseSource),
  notes: optionalText(1000),
  email: z.email("Enter a valid email").max(255).or(z.literal("")).optional(),
  address: optionalText(300),
  idNumber: optionalText(50),
  bankName: optionalText(120),
  bankAccountNumber: optionalText(50),
  momoNumber: z
    .string()
    .trim()
    .min(6, "Enter a full mobile-money number")
    .max(30)
    .or(z.literal(""))
    .optional(),
});
export type SupplierValues = z.infer<typeof supplierSchema>;

export const buyerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the buyer's name")
    .max(
      BUYER_NAME_MAX,
      `Keep the name under ${String(BUYER_NAME_MAX)} characters.`,
    ),
  phone: phoneField,
  /** A second line reaching the same person - two networks is the norm here. */
  altPhone: phoneField,
  email: z.email("Enter a valid email").max(255).or(z.literal("")).optional(),
  city: optionalText(120),
  notes: optionalText(1000),
  address: optionalText(300),
  businessName: optionalText(200),
  registrationNumber: optionalText(80),
  contactPersonName: optionalText(150),
  contactPersonPhone: phoneField,
});
export type BuyerValues = z.infer<typeof buyerSchema>;

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(2, "Enter the category name").max(100),
  description: z.string().trim().max(500).or(z.literal("")).optional(),
  statementHeading: z.string().trim().max(80).or(z.literal("")).optional(),
  statementSection: z.enum([
    "ADMINISTRATIVE",
    "COST_OF_SALES",
    "FINANCE",
    "TAX",
  ]),
});
export type ExpenseCategoryValues = z.infer<typeof expenseCategorySchema>;

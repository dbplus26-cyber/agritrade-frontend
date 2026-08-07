// Frontend validation for the financial-statement inputs. Mirrors the
// backend's src/validations/statement-validation.ts (form fields hold raw
// strings so number inputs stay clearable; the submit handlers convert).
import { z } from "zod";

/** A required money field typed as a string ("" refuses, NaN refuses). */
const moneyString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine(
      (v) => Number.isFinite(Number(v)) && Number(v) >= 0,
      `${label} must be zero or a positive amount`,
    );

export const openingBalanceSchema = z.object({
  asOfDate: z
    .string()
    .min(1, "The as-at date is required")
    .refine(
      (v) => v.endsWith("-12-31"),
      "Balances must be as at 31 December - statements cover whole years",
    ),
  cashGhs: moneyString("Cash"),
  inventoryGhs: moneyString("Inventory"),
  notes: z.string().trim().max(500).optional(),
  payablesGhs: moneyString("Payables"),
  receivablesGhs: moneyString("Receivables"),
});

export const assetClassSchema = z.object({
  capitalAllowancePool: z.string().trim().min(1, "Pool is required").max(20),
  capitalAllowanceRatePct: moneyString("Capital-allowance rate"),
  depreciationRatePct: moneyString("Depreciation rate"),
  name: z.string().trim().min(2, "Name the class").max(80),
});

export const fixedAssetSchema = z.object({
  acquiredAt: z.string().min(1, "The acquisition date is required"),
  classId: z.string().min(1, "Choose a class"),
  costGhs: moneyString("Cost").refine(
    (v) => Number(v) > 0,
    "Cost must be above zero",
  ),
  name: z.string().trim().min(2, "Name the asset").max(150),
  notes: z.string().trim().max(500).optional(),
});

export const disposeAssetSchema = z.object({
  disposalProceedsGhs: moneyString("Proceeds"),
  disposedAt: z.string().min(1, "The disposal date is required"),
});

export const drawingSchema = z.object({
  amountGhs: moneyString("Amount").refine(
    (v) => Number(v) > 0,
    "Amount must be above zero",
  ),
  notes: z.string().trim().max(300).optional(),
  occurredAt: z.string().min(1, "The date is required"),
});

/**
 * The books' own identity settings - mirrors the backend registry's
 * statement* keys (src/config/settings-registry.ts). Multi-line blocks print
 * one row per line on the cover and corporate-information page.
 */
export const statementSettingsSchema = z.object({
  statementAccountantsBlock: z.string().trim().max(400),
  statementBankersBlock: z.string().trim().max(400),
  statementBusinessName: z
    .string()
    .trim()
    .min(2, "The business name goes on every page")
    .max(120),
  statementPrincipalActivity: z.string().trim().max(400),
  statementProprietorAddress: z.string().trim().max(300),
  statementProprietorName: z.string().trim().max(120),
});
export type StatementSettingsValues = z.infer<typeof statementSettingsSchema>;

export type AssetClassValues = z.infer<typeof assetClassSchema>;
export type DisposeAssetValues = z.infer<typeof disposeAssetSchema>;
export type DrawingValues = z.infer<typeof drawingSchema>;
export type FixedAssetValues = z.infer<typeof fixedAssetSchema>;
export type OpeningBalanceValues = z.infer<typeof openingBalanceSchema>;

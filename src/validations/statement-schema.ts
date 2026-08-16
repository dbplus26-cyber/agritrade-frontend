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

/**
 * Which account the money moved through, or why none did.
 *
 * The form asks it as ONE question with two answers rather than two optional
 * fields, because two optional fields is the state the drawings ledger and the
 * asset register were already in: an amount, and nothing saying where it came
 * from. `cashSource` is the answer picked; the field under it is the answer
 * given. The backend states the same exclusive-or (cashbook/cash-source.ts)
 * and refuses both or neither - this exists so the refusal arrives before the
 * save rather than after it.
 */
export const cashSourceModes = ["ACCOUNT", "NONE"] as const;

const cashSourceFields = {
  cashSource: z.enum(cashSourceModes),
  // 300 is the backend's column width; the minimum is what separates a reason
  // from a keystroke, since "x" answers the question without saying anything.
  noCashReason: z.string().trim().max(300, "Keep it under 300 characters").optional(),
  paymentAccountId: z.string().optional(),
};

const checkCashSource = (
  value: {
    cashSource: (typeof cashSourceModes)[number];
    noCashReason?: string;
    paymentAccountId?: string;
  },
  ctx: z.RefinementCtx,
) => {
  if (value.cashSource === "ACCOUNT") {
    if (!value.paymentAccountId) {
      ctx.addIssue({
        code: "custom",
        message: "Choose the account the money moved through",
        path: ["paymentAccountId"],
      });
    }
    return;
  }
  if ((value.noCashReason ?? "").length < 3) {
    ctx.addIssue({
      code: "custom",
      message: "Say why no company money moved",
      path: ["noCashReason"],
    });
  }
};

/** The descriptive half of an asset - the half an edit is allowed to touch. */
const assetFields = {
  acquiredAt: z.string().min(1, "The acquisition date is required"),
  classId: z.string().min(1, "Choose a class"),
  costGhs: moneyString("Cost").refine(
    (v) => Number(v) > 0,
    "Cost must be above zero",
  ),
  name: z.string().trim().min(2, "Name the asset").max(150),
  notes: z.string().trim().max(500).optional(),
};

export const fixedAssetSchema = z
  .object({ ...assetFields, ...cashSourceFields })
  .superRefine(checkCashSource);

/**
 * Editing an asset. No cash source: an acquisition that has already posted
 * cannot be re-pointed at another account, and one that posted nothing has
 * nothing to re-point. The cost and date are asked for here but the dialog
 * only offers them while they are still free to move (COST_LOCKED /
 * ACQUISITION_DATE_LOCKED).
 */
export const assetEditSchema = z.object(assetFields);

export const disposeAssetSchema = z
  .object({
    disposalAccountId: z.string().optional(),
    disposalProceedsGhs: moneyString("Proceeds"),
    disposedAt: z.string().min(1, "The disposal date is required"),
  })
  // Proceeds landed somewhere or there were none. An asset scrapped or given
  // away brings in nothing and names nowhere; money that came in and named
  // nowhere is another figure the statement adds to cash while no account
  // rises by it.
  .superRefine((value, ctx) => {
    const proceeds = Number(value.disposalProceedsGhs);
    if (Number.isFinite(proceeds) && proceeds > 0 && !value.disposalAccountId) {
      ctx.addIssue({
        code: "custom",
        message: "Say which account the proceeds were paid into",
        path: ["disposalAccountId"],
      });
    }
  });

export const drawingSchema = z
  .object({
    amountGhs: moneyString("Amount").refine(
      (v) => Number(v) > 0,
      "Amount must be above zero",
    ),
    notes: z.string().trim().max(300).optional(),
    occurredAt: z.string().min(1, "The date is required"),
    ...cashSourceFields,
  })
  .superRefine(checkCashSource);

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
export type AssetEditValues = z.infer<typeof assetEditSchema>;
export type CashSourceMode = (typeof cashSourceModes)[number];
export type DisposeAssetValues = z.infer<typeof disposeAssetSchema>;
export type DrawingValues = z.infer<typeof drawingSchema>;
export type FixedAssetValues = z.infer<typeof fixedAssetSchema>;
export type OpeningBalanceValues = z.infer<typeof openingBalanceSchema>;

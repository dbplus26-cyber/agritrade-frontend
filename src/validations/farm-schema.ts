import { z } from "zod";

import { cashSourceModes } from "@/validations/statement-schema";

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

/**
 * Mirrors backend `createGrantSchema` - the signed agreement file is
 * validated separately (it rides as the multipart `agreement` part).
 *
 * A grant is money the business spent funding a farmer, so it has to name the
 * account it came out of. A grant that names none is not neutral: the statement
 * counts an outstanding grant as a receivable and a rising receivable reads as
 * cash gone, so the statement would say the money had left while the cash book
 * said every account was untouched. `cashSource` is the answer picked, the
 * field under it is the answer given, and the backend refuses both or neither
 * (CASH_SOURCE_AMBIGUOUS / CASH_SOURCE_REQUIRED).
 */
export const grantSchema = z
  .object({
    farmerId: z.string().min(1, "Choose the farmer"),
    seasonId: z.string().min(1, "Choose the season"),
    itemId: z.string().min(1, "Choose the input item"),
    quantity: posNumber("quantity", 10_000_000),
    valueGhs: posNumber("value", 100_000_000),
    notes: z.string().trim().max(500).or(z.literal("")).optional(),
    agreedTerms: z.string().trim().max(1000).or(z.literal("")).optional(),
    dueDate: z.string().or(z.literal("")).optional(),
    cashSource: z.enum(cashSourceModes),
    // 300 is the backend's column width; the minimum is what separates a
    // reason from a keystroke, since "x" answers the question without saying
    // anything.
    noCashReason: z
      .string()
      .trim()
      .max(300, "Keep it under 300 characters")
      .optional(),
    paymentAccountId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.cashSource === "ACCOUNT") {
      if (!value.paymentAccountId) {
        ctx.addIssue({
          code: "custom",
          message: "Choose the account that paid for these inputs",
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
  });

/**
 * Mirrors backend `createRepaymentSchema` - the signed receipt file is
 * validated separately (it rides as the multipart `receipt` part).
 *
 * A repayment arrives in one of two shapes, so every field belonging to only
 * one of them is optional here and the pairing is checked across the whole
 * body. Two schemas behind a union would report a mismatch as "no branch
 * matched", which tells the person filling the form nothing about which field
 * is the problem.
 *
 * The shapes must not mix: a cash row carrying a weight would put grain the
 * farmer never delivered into the season's yield, and a produce row naming an
 * account would promise a ledger line that must never be posted. The backend
 * refuses either (REPAYMENT_SHAPE).
 */
export const repaymentKinds = ["PRODUCE", "CASH"] as const;

const optionalText = z.string().trim().or(z.literal("")).optional();

/** "" and undefined both mean the reader left the field alone. */
const blank = (value: string | undefined): boolean => !value?.trim();

export const repaymentSchema = z
  .object({
    farmerId: z.string().min(1, "Choose the farmer"),
    seasonId: z.string().min(1, "Choose the season"),
    // `kind` defaults to PRODUCE, the ordinary repayment on this book.
    kind: z.enum(repaymentKinds).default("PRODUCE"),
    commodityId: optionalText,
    weightKg: optionalText,
    ratePerKgGhs: optionalText,
    amountGhs: optionalText,
    paymentAccountId: optionalText,
    intakeWarehouseId: optionalText,
    notes: z.string().trim().max(500).or(z.literal("")).optional(),
    receivedByName: z.string().trim().max(150).or(z.literal("")).optional(),
  })
  .superRefine((value, ctx) => {
    const refuse = (path: string, message: string) => {
      ctx.addIssue({ code: "custom", message, path: [path] });
    };
    /** Required, above zero and inside the backend's column width. */
    const demandNumber = (
      path: "amountGhs" | "ratePerKgGhs" | "weightKg",
      missing: string,
      max: number,
    ) => {
      const raw = value[path];
      if (blank(raw)) return refuse(path, missing);
      const parsed = Number(raw);
      if (!(parsed > 0) || parsed > max) {
        refuse(path, "Enter a valid amount");
      }
    };

    if (value.kind === "CASH") {
      demandNumber("amountGhs", "Enter the amount the farmer paid", 100_000_000);
      if (blank(value.paymentAccountId)) {
        refuse("paymentAccountId", "Say which account the money was paid into");
      }
      // Order matters only for reading: the produce fields are refused in the
      // order the form would have shown them.
      if (!blank(value.commodityId)) {
        refuse("commodityId", "A cash repayment records an amount, not a crop");
      }
      if (!blank(value.weightKg)) {
        refuse("weightKg", "A cash repayment records an amount, not a weight");
      }
      if (!blank(value.ratePerKgGhs)) {
        refuse("ratePerKgGhs", "A cash repayment needs no valuation rate");
      }
      if (!blank(value.intakeWarehouseId)) {
        refuse(
          "intakeWarehouseId",
          "Cash cannot be taken into a warehouse. Record a produce repayment instead",
        );
      }
      return;
    }

    if (blank(value.commodityId)) {
      refuse("commodityId", "Choose the crop that was repaid");
    }
    demandNumber("weightKg", "Enter the weight received", 1_000_000);
    demandNumber("ratePerKgGhs", "Enter the rate", 100_000_000);
    if (!blank(value.amountGhs)) {
      refuse(
        "amountGhs",
        "Produce is valued from its weight and rate, not an amount",
      );
    }
    if (!blank(value.paymentAccountId)) {
      refuse(
        "paymentAccountId",
        "A repayment in produce moves no money, so it names no account",
      );
    }
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
export type RepaymentKind = (typeof repaymentKinds)[number];
/** The form's own shape: `kind` has a default, so it is optional on input. */
export type RepaymentValues = z.input<typeof repaymentSchema>;
export type SeasonValues = z.infer<typeof seasonSchema>;

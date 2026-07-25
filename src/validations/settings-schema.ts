import { z } from "zod";

/**
 * Settings form schema, mirroring the backend registry
 * (agritrade-backend `src/config/settings-registry.ts`). Numbers ride as
 * strings so the inputs can be emptied while typing; the submit handler
 * converts and sends only changed keys.
 */
export const settingsSchema = z.object({
  purchaseApprovalThresholdGhs: z
    .string()
    .trim()
    .refine((v) => Number(v) > 0 && Number(v) <= 100_000_000, {
      message: "Enter an amount above zero",
    }),
  lowFloatThresholdGhs: z
    .string()
    .trim()
    .refine((v) => Number(v) > 0 && Number(v) <= 10_000_000, {
      message: "Enter an amount above zero",
    }),
  companyContactPhone: z.string().trim().max(30),
  companyContactWhatsapp: z.string().trim().max(30),
  companyContactEmail: z
    .email("Enter a valid email")
    .max(255)
    .or(z.literal("")),
  companyContactAddress: z.string().trim().max(300),
});
export type SettingsValues = z.infer<typeof settingsSchema>;

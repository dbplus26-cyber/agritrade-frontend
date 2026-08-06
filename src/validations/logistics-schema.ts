import { z } from "zod";

/**
 * Logistics registry form schemas, mirroring the backend validations in
 * agritrade-backend `src/validations/{driver,delivery-address}-validation.ts`
 * so the client rejects the same input the server would. Optional text fields
 * accept "" here; the submit handlers omit empty values (create) or send null
 * (edit clears).
 */

const optionalText = (max: number) =>
  z.string().trim().max(max).or(z.literal("")).optional();

/** Backend optional phone: min 6 / max 20; "" means "not provided". */
const optionalPhone = z
  .string()
  .trim()
  .min(6, "Enter a full phone number")
  .max(20)
  .or(z.literal(""))
  .optional();

/** Backend: name req 2-120, phone req 6-20, the rest optional. */
export const driverSchema = z.object({
  name: z.string().trim().min(2, "Enter the driver's name").max(120),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a full phone number")
    .max(20),
  email: z.email("Enter a valid email").max(255).or(z.literal("")).optional(),
  company: optionalText(150),
  city: optionalText(120),
  licenseNo: optionalText(50),
  idNumber: optionalText(50),
  notes: optionalText(1000),
  /** This driver's standing haulage terms. "" means the system default. */
  paymentPolicyId: z.string().optional(),
});
export type DriverValues = z.infer<typeof driverSchema>;

/** Backend: label req 2-150, city req 1-120, contactPhone 6-20 optional. */
export const deliveryAddressSchema = z.object({
  label: z.string().trim().min(2, "Enter a label for this address").max(150),
  city: z.string().trim().min(1, "Enter the city").max(120),
  area: optionalText(120),
  digitalAddress: optionalText(50),
  landmark: optionalText(200),
  shopName: optionalText(150),
  contactName: optionalText(150),
  contactPhone: optionalPhone,
  directions: optionalText(1000),
});
export type DeliveryAddressValues = z.infer<typeof deliveryAddressSchema>;

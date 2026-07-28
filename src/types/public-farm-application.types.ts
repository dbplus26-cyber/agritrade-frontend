/**
 * Public farming-programme applications - mirrors the backend
 * `POST /api/v1/public/farm-applications` contract (the Zod schema in
 * `validations/farm-application-schema.ts` validates the same shape).
 * Public half only; the admin console has its own farm types.
 */

/** `POST public/farm-applications` body. Only name + phone are required. */
export interface ISubmitFarmApplicationInput {
  name: string;
  phone: string;
  email?: string;
  community?: string;
  address?: string;
  farmLocation?: string;
  farmSizeAcres?: number;
  crops?: string;
  itemsNeeded?: string;
  expectedYieldKg?: number;
  previousExperience?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  message?: string;
  /** Honeypot - sent empty by real users; bots that fill it are rejected. */
  website?: string;
  /** Cloudflare Turnstile token - required when enforcement is on. */
  turnstileToken?: string;
}

/** `POST public/farm-applications` 201 - receipt-style reference "FA-XXXX". */
export interface ISubmitFarmApplicationResponse {
  message: string;
  data: {
    reference: string;
  };
}

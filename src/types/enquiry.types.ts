/**
 * Contact enquiries - mirrors the backend `POST /api/v1/public/enquiries`
 * contract (the Zod schema in `validations/enquiry-schema.ts` is the same shape
 * the server validates; the backend source of truth is agritrade-backend's
 * `validations/enquiry-validation.ts`).
 */
export const ENQUIRY_SUBJECTS = [
  "General enquiry",
  "Maize",
  "Soya beans",
  "Groundnuts",
  "Land / plots",
  "Farming investment",
] as const;

export type EnquirySubject = (typeof ENQUIRY_SUBJECTS)[number];

export interface IEnquiryInput {
  fullName: string;
  phone: string;
  email?: string;
  subject: EnquirySubject;
  message: string;
  /** Honeypot field - sent empty by real users; bots that fill it get 403'd. */
  website?: string;
  /** Cloudflare Turnstile token - required by the backend when enforcement is on. */
  turnstileToken?: string;
}

export interface IEnquiry extends IEnquiryInput {
  id: string;
  /** Receipt-style reference shown to the sender, e.g. "EN-4F2A". */
  reference: string;
  receivedAt: string;
}

/** `POST /enquiries` - standard `{ message, data }` envelope. */
export interface IEnquiryResponse {
  message: string;
  data: IEnquiry;
}

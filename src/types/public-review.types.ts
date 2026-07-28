/**
 * Public customer reviews - mirrors the backend's public reviews contract
 * (`GET /api/v1/public/reviews` and `POST /api/v1/public/reviews`). The Zod
 * schema in `validations/review-schema.ts` validates the same shape the
 * server does. Kept separate from any admin review types on purpose: this
 * file is the public site's half of the contract.
 */

export const REVIEW_ROLES = ["BUYER", "SUPPLIER", "FARMER", "CUSTOMER"] as const;
export type ReviewRole = (typeof REVIEW_ROLES)[number];

/** Human labels for the role enum, e.g. on review cards and the form select. */
export const REVIEW_ROLE_LABELS: Record<ReviewRole, string> = {
  BUYER: "Buyer",
  SUPPLIER: "Supplier",
  FARMER: "Farmer",
  CUSTOMER: "Customer",
};

/** One published review as `GET public/reviews` returns it. */
export interface IPublicReview {
  id: string;
  authorName: string;
  role: ReviewRole;
  /** 1-5. */
  rating: number;
  text: string;
  /** True when the office matched the review to a real transaction. */
  verified: boolean;
  /** PUBLIC = submitted through this form; ADMIN = recorded by the office. */
  source: "PUBLIC" | "ADMIN";
  createdAt: string;
}

/** `GET public/reviews?limit=n` - standard `{ message, data }` envelope. */
export interface IPublicReviewListResponse {
  message: string;
  data: { reviews: IPublicReview[] };
}

/** `POST public/reviews` body. */
export interface ISubmitPublicReviewInput {
  authorName: string;
  /** 1-5. */
  rating: number;
  text: string;
  role?: ReviewRole;
  /** The number on the customer's receipt or waybill, e.g. SAL-2026-00042. */
  transactionNo: string;
  /** The phone number used on that transaction. */
  phone: string;
  /** Honeypot - sent empty by real users; bots that fill it are rejected. */
  website?: string;
  /** Cloudflare Turnstile token - required when enforcement is on. */
  turnstileToken?: string;
}

/** `POST public/reviews` 201 - the review goes to moderation first. */
export interface ISubmitPublicReviewResponse {
  message: string;
  data: {
    review: {
      id: string;
      authorName: string;
      rating: number;
      role: ReviewRole;
      createdAt: string;
    };
  };
}

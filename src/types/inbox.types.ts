import type { IPaginationMeta } from "./api";
import type { ReviewRole } from "./public-review.types";

/**
 * The website inbox - the admin half of the public site's three intake
 * surfaces (contact enquiries, moderated reviews, farming-programme
 * applications). Mirrors the backend DTOs in agritrade-backend's
 * `utils/mappers/{enquiry,review,farm-application}.mapper.ts` exactly; the
 * public halves of these contracts stay in `enquiry.types.ts`,
 * `public-review.types.ts` and `public-farm-application.types.ts`.
 */

// ── Enquiries ────────────────────────────────────────────────────────

export const ENQUIRY_STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/** The console row (backend `AdminEnquiry`): public shape + workflow fields. */
export interface IAdminEnquiry {
  id: string;
  /** Receipt-style reference, e.g. "EN-4F2A". */
  reference: string;
  fullName: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  /** Internal working notes - never shown to the sender. */
  notes: null | string;
  /** Submitting IP (abuse forensics), admin-only. */
  ip: null | string;
  receivedAt: string;
  updatedAt: string;
  /**
   * The replies already sent, oldest first. The conversation lives in the
   * system rather than in one person's sent folder, so whoever picks the
   * enquiry up next can see it has been answered.
   */
  replies: IEnquiryReply[];
}

export interface IEnquiryReply {
  id: string;
  body: string;
  /** Snapshotted at send time, so editing the enquiry never rewrites it. */
  sentToEmail: string;
  /**
   * False when the send failed. The reply is recorded either way, because a
   * failed send is exactly the thing staff have to be able to see and retry.
   */
  delivered: boolean;
  sentById: null | string;
  sentAt: string;
}

export interface IEnquiryListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: EnquiryStatus;
  /** YYYY-MM-DD received-date window. */
  from?: string;
  to?: string;
}

export interface IAdminEnquiryListResponse {
  message: string;
  data: IAdminEnquiry[];
  meta: IPaginationMeta;
}

export interface IEnquiryStats {
  total: number;
  new: number;
  inProgress: number;
  resolved: number;
}

export interface IEnquiryStatsResponse {
  message: string;
  data: IEnquiryStats;
}

export interface IAdminEnquiryResponse {
  message: string;
  data: { enquiry: IAdminEnquiry };
}

/** PATCH body - at least one field (backend `updateEnquirySchema`). */
export interface IUpdateEnquiryInput {
  status?: EnquiryStatus;
  notes?: null | string;
}

// ── Reviews ──────────────────────────────────────────────────────────

export const REVIEW_STATUSES = ["PENDING", "PUBLISHED", "REJECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewSource = "ADMIN" | "PUBLIC";

/** The moderation row (backend `AdminReviewDTO`). */
export interface IAdminReview {
  id: string;
  authorName: string;
  role: ReviewRole;
  /** 1-5. */
  rating: number;
  text: string;
  /** True when the office matched the review to a real transaction. */
  verified: boolean;
  /** PUBLIC = submitted through the site; ADMIN = recorded by the office. */
  source: ReviewSource;
  status: ReviewStatus;
  /** Verification pair quoted by public reviewers; admin-only. */
  transactionNo: null | string;
  phone: null | string;
  ip: null | string;
  createdById: null | string;
  decidedById: null | string;
  decidedAt: null | string;
  createdAt: string;
  updatedAt: string;
}

export interface IReviewListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReviewStatus;
  role?: ReviewRole;
}

export interface IAdminReviewListResponse {
  message: string;
  data: IAdminReview[];
  meta: IPaginationMeta;
}

export interface IReviewStats {
  total: number;
  pending: number;
  published: number;
  rejected: number;
}

export interface IReviewStatsResponse {
  message: string;
  data: IReviewStats;
}

export interface IAdminReviewResponse {
  message: string;
  data: { review: IAdminReview };
}

/** POST body (backend `createAdminReviewSchema`): published instantly,
 * source ADMIN, never verified. */
export interface ICreateAdminReviewInput {
  authorName: string;
  rating: number;
  text: string;
  role?: ReviewRole;
}

// ── Farm applications ────────────────────────────────────────────────

export const FARM_APPLICATION_STATUSES = [
  "NEW",
  "REVIEWING",
  "APPROVED",
  "REJECTED",
  "CONVERTED",
] as const;
export type FarmApplicationStatus = (typeof FARM_APPLICATION_STATUSES)[number];

/** The review row (backend `AdminFarmApplicationDTO`). */
export interface IAdminFarmApplication {
  id: string;
  /** Receipt-style reference, e.g. "FA-4F2A". */
  reference: string;
  name: string;
  phone: string;
  email: null | string;
  community: null | string;
  address: null | string;
  farmLocation: null | string;
  farmSizeAcres: null | number;
  crops: null | string;
  itemsNeeded: null | string;
  expectedYieldKg: null | number;
  previousExperience: null | string;
  guarantorName: null | string;
  guarantorPhone: null | string;
  message: null | string;
  status: FarmApplicationStatus;
  /** Internal working notes - never shown to the applicant. */
  adminNotes: null | string;
  reviewedById: null | string;
  reviewedAt: null | string;
  /** Set once the application is converted into a farmer record. */
  convertedFarmerId: null | string;
  ip: null | string;
  createdAt: string;
  updatedAt: string;
}

export interface IFarmApplicationListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: FarmApplicationStatus;
}

export interface IFarmApplicationListResponse {
  message: string;
  data: IAdminFarmApplication[];
  meta: IPaginationMeta;
}

export interface IFarmApplicationStats {
  total: number;
  new: number;
  reviewing: number;
  approved: number;
  rejected: number;
  converted: number;
}

export interface IFarmApplicationStatsResponse {
  message: string;
  data: IFarmApplicationStats;
}

export interface IFarmApplicationResponse {
  message: string;
  data: { application: IAdminFarmApplication };
}

/** POST /:id/convert - the application plus the farmer it created. */
export interface IConvertFarmApplicationResponse {
  message: string;
  data: {
    application: IAdminFarmApplication;
    farmer: { id: string; name: string; phone: null | string };
  };
}

/** PATCH body - at least one field (backend `updateFarmApplicationSchema`). */
export interface IUpdateFarmApplicationInput {
  status?: FarmApplicationStatus;
  adminNotes?: null | string;
}

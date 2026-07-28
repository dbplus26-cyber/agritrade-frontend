import type { IPaginationMeta } from "./api";

/**
 * The generic approval engine, mirroring the backend `approval.mapper.ts`
 * and the `/admin/approvals` surface.
 */

/** Mirrors the backend `ApprovalAction` enum (grows one value per module). */
export enum ApprovalAction {
  PURCHASE_ABOVE_THRESHOLD = "PURCHASE_ABOVE_THRESHOLD",
  STOCK_ADJUSTMENT = "STOCK_ADJUSTMENT",
  PUBLISH_TO_WEBSITE = "PUBLISH_TO_WEBSITE",
  LOAD_BELOW_MILESTONE = "LOAD_BELOW_MILESTONE",
  INPUT_GRANT_ABOVE_THRESHOLD = "INPUT_GRANT_ABOVE_THRESHOLD",
}

/** Mirrors the backend `ApprovalStatus` enum. */
export enum ApprovalStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

/** A resolved requester/decider - id plus display name. */
export interface IApprovalActor {
  id: string;
  name: string;
}

/**
 * One approval request. `summary` is the display snapshot captured at
 * request time - its shape varies by action, so consumers must render it
 * defensively (see approval-bits). `requestedBy`/`decidedBy` are resolved
 * server-side; null only when the user no longer resolves.
 */
export interface IApproval {
  id: string;
  entityType: string;
  entityId: string;
  action: ApprovalAction;
  status: ApprovalStatus;
  summary: unknown;
  note: string | null;
  requestedById: string;
  requestedBy: IApprovalActor | null;
  decidedById: string | null;
  decidedBy: IApprovalActor | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface IApprovalListResponse {
  message: string;
  data: IApproval[];
  meta: IPaginationMeta;
}

export interface IApprovalResponse {
  message: string;
  data: { approval: IApproval };
}

export interface IPendingCountResponse {
  message: string;
  data: { pending: number };
}

/** Mirrors backend `approvalListQuery` (dates travel as YYYY-MM-DD). */
export interface IApprovalListQuery {
  page?: number;
  limit?: number;
  status?: ApprovalStatus;
  action?: ApprovalAction;
  search?: string;
  from?: string;
  to?: string;
}

export interface IDecideApprovalInput {
  id: string;
  note?: string;
}

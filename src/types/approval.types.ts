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

  /* The queue's display fields, folded server-side from the request-time
     snapshot (see the backend approval.mapper). Every one is nullable
     because a snapshot written by an older code path may not carry it -
     and because money is redacted to null for staff without financial
     visibility. Render nothing rather than a placeholder for a genuine
     null; the absence is itself information. */

  /** The money figure under decision. Null when non-monetary OR redacted. */
  amount: number | null;
  currency: string;
  /** The threshold that was breached, null when the rule is not a limit. */
  limit: number | null;
  /** True when `limit` is today's setting rather than the one snapshotted. */
  limitIsCurrent: boolean;
  /** Signed quantity headline for non-monetary items ("+250 kg Maize"). */
  quantityLabel: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  /** Supplier, farmer or buyer, when the snapshot captured one. */
  counterparty: string | null;
  warehouse: string | null;
  subject: string;
  subjectDetail: string | null;
  sourceModule: string;
  /** The human document number (PUR-2026-00418), null where none exists. */
  sourceRef: string | null;
  sourceHref: string;
  /** Requester and decider are the same ACCOUNT - never compare names. */
  selfDecided: boolean;
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

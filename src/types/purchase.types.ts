import type { IPaginationMeta } from "./api";
import type { ApprovalStatus } from "./approval.types";
import type { PurchaseSource } from "./registry.types";

/**
 * The purchase pipeline, mirroring the backend `toPurchaseDTO`
 * (agritrade-backend src/utils/mappers/purchase.mapper.ts) and the
 * `/admin/purchases` + `/agent/purchases` surfaces.
 */

/** Mirrors the backend `PurchaseStatus` enum. */
export enum PurchaseStatus {
  RECORDED = "RECORDED",
  IN_TRANSIT = "IN_TRANSIT",
  RECEIVED = "RECEIVED",
  VOIDED = "VOIDED",
}

/** Mirrors `toPurchaseDTO`. Money and weights are numbers in GHS / kg. */
export interface IPurchase {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  status: PurchaseStatus;
  source: PurchaseSource;
  commodity: { id: string; name: string };
  supplier: { id: string; name: string } | null;
  agent: { profileId: string; name: string } | null;
  warehouse: { id: string; name: string } | null;
  /**
   * PURCHASE_ABOVE_THRESHOLD overlay: PENDING flags the purchase in lists,
   * REJECTED is the owner's cue to void. Null below the threshold (and on
   * agent-facing reads, which do not surface approvals).
   */
  approval: { id: string; status: ApprovalStatus } | null;
  weightKg: number;
  receivedKg: number | null;
  /** Recorded minus received weight (spillage/moisture); null until receipt. */
  varianceKg: number | null;
  /** Null when the API redacted it (financial visibility). */
  unitPriceGhs: number | null;
  /** Null when the API redacted it (financial visibility). */
  totalGhs: number | null;
  photo: string | null;
  notes: string | null;
  idempotencyKey: string | null;
  purchasedAt: string;
  inTransitAt: string | null;
  receivedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPurchaseResponse {
  message: string;
  data: { purchase: IPurchase };
}

export interface IPurchaseListResponse {
  message: string;
  data: IPurchase[];
  meta: IPaginationMeta;
}

/** Mirrors backend `purchaseListQuery` (dates travel as YYYY-MM-DD). */
export interface IPurchaseListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: PurchaseStatus;
  source?: PurchaseSource;
  commodityId?: string;
  warehouseId?: string;
  supplierId?: string;
  agentProfileId?: string;
  from?: string;
  to?: string;
}

/** Mirrors backend `createPurchaseSchema` (admin create). */
export interface ICreatePurchaseInput {
  source: PurchaseSource;
  commodityId: string;
  supplierId?: string;
  agentProfileId?: string;
  warehouseId?: string;
  weightKg: number;
  unitPriceGhs: number;
  purchasedAt: string;
  notes?: string;
  idempotencyKey?: string;
}

/** Mirrors backend `agentCreatePurchaseSchema` (own float, source forced). */
export interface IAgentCreatePurchaseInput {
  commodityId: string;
  supplierId?: string;
  warehouseId?: string;
  weightKg: number;
  unitPriceGhs: number;
  purchasedAt: string;
  notes?: string;
}

export interface IReceivePurchaseInput {
  receivedKg: number;
  warehouseId?: string;
  receivedAt?: string;
}

export interface IVoidPurchaseInput {
  reason: string;
}

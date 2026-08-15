import type { IPaginationMeta } from "./api";
import type { SalePaymentMethod } from "./admin-sale.types";
import type { ApprovalStatus } from "./approval.types";
import type { PurchaseSource } from "./registry.types";

/**
 * The purchase pipeline, mirroring the backend `toPurchaseDTO`
 * (agritrade-backend src/utils/mappers/purchase.mapper.ts) and the
 * `/admin/purchases` + `/agent/purchases` surfaces.
 */

/**
 * The error code the receive endpoint returns when the warehouse weight is
 * outside the backend's variance tolerance. It is a question, not a refusal:
 * re-submitting with `confirmVariance: true` records the receipt and keeps the
 * gap as variance.
 */
export const RECEIPT_VARIANCE_CODE = "RECEIPT_VARIANCE";

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
  /**
   * What has been paid for these goods, and what is still owed the supplier.
   * Null when the read did not resolve it. A purchase is a DOCUMENT - recording
   * one moves no money - so this is the only thing that says whether anybody
   * has actually been paid.
   *
   * The STATUS survives money redaction on purpose: whether a supplier has
   * been paid is an operational fact, and it discloses no figure.
   */
  settlement: {
    outstandingGhs: number | null;
    paidGhs: number | null;
    status: PurchaseSettlementStatus;
  } | null;
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
  /** Omit to record the purchase unpaid - the supplier is simply owed. */
  payment?: IPurchasePaymentOnCreate;
  idempotencyKey?: string;
}

export type PurchaseSettlementStatus = "PAID" | "PART_PAID" | "UNPAID";

/** Paying in the same submission that records the purchase. */
export interface IPurchasePaymentOnCreate {
  amountGhs: number;
  /** Field case: the paying agent's own float covered it. */
  fromFloat?: boolean;
  method: SalePaymentMethod;
  paidAt?: string;
  paymentAccountId?: string;
  reference?: string;
}

/** Mirrors backend `recordPurchasePaymentSchema`. */
export interface IRecordPurchasePaymentInput {
  amountGhs: number;
  method: SalePaymentMethod;
  paidAt?: string;
  paymentAccountId?: string;
  reference?: string;
}

export interface IPurchasePayment {
  amountGhs: number | null;
  /** True when a field agent's float paid this, not a company account. */
  fromFloat: boolean;
  id: string;
  isReversal: boolean;
  method: SalePaymentMethod;
  paidAt: string;
  paymentAccount: { id: string; label: string } | null;
  reference: string | null;
  reversalReason: string | null;
  reversedByPaymentId: string | null;
  transactionNo: string;
}

export interface IPurchaseSettlement {
  outstandingGhs: number | null;
  paidGhs: number | null;
  status: PurchaseSettlementStatus;
}

export interface IPurchasePaymentsResponse {
  message: string;
  data: { payments: IPurchasePayment[]; settlement: IPurchaseSettlement };
}

export interface IPurchasePaymentResponse {
  message: string;
  data: { payment: IPurchasePayment; settlement: IPurchaseSettlement };
}

export interface IPurchasePaymentReversalResponse {
  message: string;
  data: { reversal: IPurchasePayment; settlement: IPurchaseSettlement };
}

export interface IUnpaidPurchasesResponse {
  message: string;
  data: IUnpaidPurchase[];
  meta: IPaginationMeta;
}

export interface IUnpaidPurchase {
  amountGhs: number | null;
  commodity: { id: string; name: string };
  id: string;
  outstandingGhs: number | null;
  paidGhs: number | null;
  purchasedAt: string;
  status: PurchaseSettlementStatus;
  supplier: { id: string; name: string } | null;
  transactionNo: string;
}

/** Mirrors backend `agentCreatePurchaseSchema` (own float, source forced). */
export interface IAgentCreatePurchaseInput {
  commodityId: string;
  supplierId?: string;
  warehouseId?: string;
  weightKg: number;
  unitPriceGhs: number;
  purchasedAt: string;
  /**
   * How it was paid for, if it was. Omit and the purchase records unpaid - the
   * farmer is owed. The paying account is always the agent's own float, which
   * the server resolves from their profile, so `paymentAccountId` is not part
   * of this shape.
   */
  payment?: Omit<IPurchasePaymentOnCreate, "paymentAccountId">;
  notes?: string;
}

export interface IReceivePurchaseInput {
  receivedKg: number;
  warehouseId?: string;
  receivedAt?: string;
  /**
   * Acknowledges a warehouse weight that differs from the recorded village
   * weight beyond the backend's tolerance. Without it the API refuses the
   * receipt with `RECEIPT_VARIANCE` (see `RECEIPT_VARIANCE_CODE`) so the
   * console can make someone look at the gap before it is written down.
   */
  confirmVariance?: boolean;
}

export interface IVoidPurchaseInput {
  reason: string;
}

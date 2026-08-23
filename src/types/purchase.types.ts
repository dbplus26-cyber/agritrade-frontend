import type { IPaginationMeta } from "./api";
import type { SalePaymentMethod } from "./admin-sale.types";
import type { ApprovalStatus } from "./approval.types";
import type { IExpense, ICreateExpenseResponse } from "./expense.types";
import type { ExpensePaymentBody } from "@/validations/expense-payment-fields";
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

/**
 * The error code returned when a cost is charged against a struck-out
 * purchase. A void reverses the money and the stock, so there are no goods
 * left to carry an acquisition cost and no month that should be charged for
 * one; the console hides the action once a purchase is voided, and this
 * catches the case where somebody had the page open before it was.
 */
export const PURCHASE_VOIDED_CODE = "PURCHASE_VOIDED";

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
  /**
   * A settled Hubtel send this books against instead of describing a movement
   * of its own. The server resolves the paying account (the payout wallet) and
   * posts NO movement, because the send already moved the money. Never sent
   * together with paymentAccountId.
   */
  disbursementId?: string;
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

/**
 * A cost incurred to acquire these goods: haulage from the farm gate,
 * loading, porterage, bagging - or a licence that is tied to the purchase but
 * is not part of what the grain cost.
 *
 * An expense voucher like any other (same table, same numbering, same
 * settlement screen), plus the one fact that only exists on this link.
 */
export interface IPurchaseCost extends IExpense {
  /**
   * The instant this cost was taken INTO the goods, and `null` when it was
   * left as a cost of its own month.
   *
   * A date rather than a flag because that is the fact the books need: the
   * goods gain the cost on the day it was incurred, not the day the row was
   * typed, so a cost entered in August for a July load still lands in July.
   * Decided once when the cost is recorded and never revisited - changing it
   * afterwards would mean the month it was first read in quietly stops
   * reproducing.
   */
  capitalisedAt: string | null;
}

/**
 * The costs standing against one purchase.
 *
 * Served by `GET /api/v1/admin/purchases/:purchaseId/expenses`, beside the
 * POST at the same path. The shape below is what this console
 * reads: the vouchers, unpaginated the way the payment ledger is, each
 * carrying `capitalisedAt`. No totals travel with them on purpose - a figure
 * redacted for one reader has to stay redacted in the sum, so the sum is
 * taken here from the same nullable amounts the rows show.
 */
export interface IPurchaseCostsResponse {
  message: string;
  data: { expenses: IPurchaseCost[] };
}

/** Mirrors backend `purchaseExpenseSchema` (validations/purchase-validation.ts). */
export interface IAddPurchaseCostInput {
  amountGhs: number;
  /**
   * Take the cost into the goods rather than into the month.
   *
   * The server defaults it to true; the console sends it explicitly on every
   * submission, because a default that decides an unchangeable treatment for
   * somebody is exactly what this field exists to stop.
   */
  capitalise: boolean;
  categoryId: string;
  description?: string;
  incurredAt?: string;
  /**
   * Settling it in the same act. Absent means the cost is recorded as owed and
   * nothing leaves an account; the server then settles it from its own voucher
   * when the money moves.
   */
  payment?: ExpensePaymentBody;
}

/**
 * What recording a purchase cost answers with. The same envelope the
 * standalone expense endpoint returns: the voucher and how settled it is.
 */
export type IAddPurchaseCostResponse = ICreateExpenseResponse;

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
  /**
   * The goods never enter a shed: they stay with the supplier until a truck
   * collects them for the buyer. Exclusive with `warehouseId` - a receipt that
   * named both would be describing two different events.
   */
  direct?: boolean;
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

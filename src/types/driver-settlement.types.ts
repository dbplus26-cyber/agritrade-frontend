import type { IPaginationMeta } from "./api";
import type { SalePaymentMethod } from "./admin-sale.types";

/**
 * When a driver-payment milestone falls due.
 *
 * Deliberately NOT the sale-side MilestoneTrigger. A haulier is paid against
 * loading and delivery; a buyer pays against a deposit and the truck's arrival.
 * Sharing one union would let a sale term be offered on a haulage form.
 */
export type DriverMilestoneTrigger =
  | "AT_LOADING"
  | "ON_DELIVERY"
  | "ON_DEMAND";

/** How settled a trip is, without needing the figures to work it out. */
export type DriverSettlementStatus =
  | "PART_PAID"
  | "SETTLED"
  | "UNPAID"
  /** No fee has been agreed yet - which is not the same as owing nothing. */
  | "UNPRICED";

export interface IDriverMilestone {
  label: string;
  percent: number;
  trigger: DriverMilestoneTrigger;
}

/** A milestone on a priced trip: its cash amount may be redacted. */
export interface IDriverMilestoneAmount extends IDriverMilestone {
  amountGhs: number | null;
}

export interface IDriverPaymentPolicy {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  milestones: IDriverMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface IDriverPayment {
  id: string;
  /** Human-readable voucher number, e.g. "DRP-2026-00042". */
  transactionNo: string;
  /** Signed: negative on the row that cancels another. Null when redacted. */
  amountGhs: number | null;
  method: SalePaymentMethod;
  paidAt: string;
  paymentAccount: { id: string; label: string } | null;
  reference: string | null;
  /** True for the compensating row, so the ledger can mark it as such. */
  isReversal: boolean;
  reversalReason: string | null;
  /** Set on a payment that has been reversed, pointing at its reversal. */
  reversedByPaymentId: string | null;
}

/** One recorded change to a dispatched trip's fee. */
export interface IDriverFeeAdjustment {
  id: string;
  /** Signed: positive raised what the driver is owed, negative reduced it. */
  amountGhs: number | null;
  reason: string;
  createdAt: string;
}

export interface IDriverSettlement {
  /** Null until a fee is agreed, or when redacted - see hasFee. */
  feeGhs: number | null;
  paidGhs: number | null;
  outstandingGhs: number | null;
  dueAtLoadingGhs: number | null;
  /** When the fee was agreed, so a disputed figure has a date on it. */
  agreedAt: string | null;
  /** What was ORIGINALLY agreed, before any post-dispatch adjustment. */
  agreedFeeGhs: number | null;
  /** Sum of the adjustments. Positive raised the fee, negative reduced it. */
  adjustedByGhs: number | null;
  /** False until a fee is agreed. Never infer this from feeGhs being null. */
  hasFee: boolean;
  milestones: IDriverMilestoneAmount[];
  policy: { id: string; name: string } | null;
  /** False when the frozen terms could not be read back. */
  snapshotValid: boolean;
  status: DriverSettlementStatus;
}

export interface IDriverSettlementResponse {
  message: string;
  data: {
    adjustments: IDriverFeeAdjustment[];
    /** The trip's own dispatch date: a disputed fee is argued against it. */
    departedAt: string | null;
    driver: { id: string | null; name: string; phone: string | null };
    payments: IDriverPayment[];
    settlement: IDriverSettlement;
  };
}

/** A trip that still owes its driver something - the send-money picker feed. */
export interface IUnsettledTrip {
  id: string;
  transactionNo: string;
  driverName: string;
  feeGhs: number | null;
  paidGhs: number | null;
  outstandingGhs: number | null;
  status: string;
}

export interface IUnsettledTripListResponse {
  message: string;
  data: IUnsettledTrip[];
  meta: IPaginationMeta;
}

export interface IDriverPaymentPolicyListResponse {
  message: string;
  data: IDriverPaymentPolicy[];
  meta: IPaginationMeta;
}

export interface IDriverPaymentPolicyResponse {
  message: string;
  data: { policy: IDriverPaymentPolicy };
}

export interface ICreateDriverPaymentPolicyInput {
  name: string;
  milestones: IDriverMilestone[];
  isDefault?: boolean;
}

export interface IUpdateDriverPaymentPolicyInput {
  name?: string;
  milestones?: IDriverMilestone[];
  isDefault?: boolean;
  isActive?: boolean;
}

export interface ISetDriverFeeInput {
  feeGhs: number;
  /** Overrides the driver's standing policy for this trip only. */
  policyId?: string;
}

export interface IAdjustDriverFeeInput {
  /** Signed: positive raises what the driver is owed, negative reduces it. */
  amountGhs: number;
  reason: string;
}

export interface IRecordDriverPaymentInput {
  amountGhs: number;
  method: SalePaymentMethod;
  paidAt?: string;
  paymentAccountId?: string;
  reference?: string;
}

// ── Expense settlement ────────────────────────────────────────────

export type ExpenseSettlementStatus = "PAID" | "PART_PAID" | "UNPAID";

export interface IExpensePayment {
  id: string;
  transactionNo: string;
  amountGhs: number | null;
  method: SalePaymentMethod;
  paidAt: string;
  paymentAccount: { id: string; label: string } | null;
  reference: string | null;
  isReversal: boolean;
  reversalReason: string | null;
  reversedByPaymentId: string | null;
}

export interface IExpenseSettlement {
  paidGhs: number | null;
  outstandingGhs: number | null;
  status: ExpenseSettlementStatus;
}

export interface IExpensePaymentLedgerResponse {
  message: string;
  data: { payments: IExpensePayment[]; settlement: IExpenseSettlement };
}

/** A cost that still owes money - the send-money picker feed. */
export interface IUnpaidExpense {
  id: string;
  transactionNo: string;
  category: { id: string; name: string };
  description: string | null;
  incurredAt: string;
  amountGhs: number | null;
  paidGhs: number | null;
  outstandingGhs: number | null;
  status: ExpenseSettlementStatus;
  shipment: { id: string; transactionNo: string } | null;
}

export interface IUnpaidExpenseListResponse {
  message: string;
  data: IUnpaidExpense[];
  meta: IPaginationMeta;
}

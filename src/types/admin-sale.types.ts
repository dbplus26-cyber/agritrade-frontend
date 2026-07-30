// src/types/admin-sale.types.ts
//
// The admin sales surface (design doc 5.5), mirroring the backend DTOs. Every
// money field is `number | null`: the API redacts prices, totals and balances
// for staff without financial visibility (design doc 8.3), just like purchases.
import type { IPaginationMeta } from "./api";
import type { ShipmentStatus } from "./admin-shipment.types";

export type SaleStatus =
  | "CANCELLED"
  | "COMPLETED"
  | "CONFIRMED"
  | "DRAFT"
  | "FULFILLED";

export type MilestoneTrigger = "BEFORE_LOADING" | "ON_ARRIVAL" | "ON_DEMAND";

export type SalePaymentMethod = "BANK" | "CASH" | "MOMO";

export interface IMilestone {
  label: string;
  percent: number;
  trigger: MilestoneTrigger;
}

/** A milestone as returned on a sale detail: its cash amount may be redacted. */
export interface ISaleMilestone extends IMilestone {
  amountGhs: number | null;
}

export interface ISaleLine {
  id: string;
  commodity: { id: string; name: string };
  weightKg: number;
  unitPriceGhs: number | null;
  totalGhs: number | null;
}

export interface ISalePayment {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  amountGhs: number | null;
  method: SalePaymentMethod;
  reference: string | null;
  paidAt: string;
}

/** A shipment carrying (part of) a sale, newest-first on the sale DTO. */
export interface ISaleShipment {
  id: string;
  transactionNo: string;
  status: ShipmentStatus;
  truckReg: string;
  destination: string;
  departedAt: string | null;
  createdAt: string;
}

export interface ISale {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  status: SaleStatus;
  buyer: { id: string; name: string; phone: string | null };
  paymentPolicy: { id: string; name: string } | null;
  agreedTotalGhs: number | null;
  paidGhs: number | null;
  balanceGhs: number | null;
  notes: string | null;
  lines: ISaleLine[];
  shipments: ISaleShipment[];
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Detail read adds the milestone schedule and the payments ledger. */
export interface ISaleDetail extends ISale {
  milestones: ISaleMilestone[];
  payments: ISalePayment[];
  requiredBeforeLoadingGhs: number | null;
  /** True once payments cover every BEFORE_LOADING milestone. */
  beforeLoadingMet: boolean;
  /** True once payments cover the full agreed total. */
  fullyPaid: boolean;
}

export interface ISaleListResponse {
  message: string;
  data: ISale[];
  meta: IPaginationMeta;
}

export interface ISaleDetailResponse {
  message: string;
  data: { sale: ISaleDetail };
}

export interface ISaleListQuery {
  page?: number;
  limit?: number;
  status?: SaleStatus;
  buyerId?: string;
  outstanding?: boolean;
  search?: string;
  from?: string;
  to?: string;
}

export interface ISaleLineInput {
  commodityId: string;
  weightKg: number;
  unitPriceGhs: number;
}

export interface ICreateSaleInput {
  buyerId: string;
  lines: ISaleLineInput[];
  paymentPolicyId?: string;
  notes?: string;
}

export interface IUpdateSaleInput {
  buyerId?: string;
  lines?: ISaleLineInput[];
  paymentPolicyId?: string | null;
  notes?: string | null;
}

export interface IRecordPaymentInput {
  amountGhs: number;
  method: "BANK" | "CASH" | "MOMO";
  reference?: string;
  paidAt?: string;
  /** Company account the money landed in. Required for BANK/MOMO. */
  paymentAccountId?: string;
}

export interface ISalePaymentResponse {
  message: string;
  data: { payment: ISalePayment };
}

export interface ISaleStats {
  countByStatus: Record<SaleStatus, number>;
  salesInProgress: number;
  agreedValueLiveGhs: number | null;
  outstandingGhs: number | null;
  debtorSaleCount: number;
}

export interface ISaleStatsResponse {
  message: string;
  data: ISaleStats;
}

// ── Payment policies ──────────────────────────────────────────────
export interface IPaymentPolicy {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  milestones: IMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface IPaymentPolicyListResponse {
  message: string;
  data: IPaymentPolicy[];
  meta: IPaginationMeta;
}

export interface IPaymentPolicyResponse {
  message: string;
  data: { policy: IPaymentPolicy };
}

export interface ICreatePaymentPolicyInput {
  name: string;
  milestones: IMilestone[];
  isDefault?: boolean;
}

export interface IUpdatePaymentPolicyInput {
  name?: string;
  milestones?: IMilestone[];
  isDefault?: boolean;
  isActive?: boolean;
}

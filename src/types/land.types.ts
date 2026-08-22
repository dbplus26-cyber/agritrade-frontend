// src/types/land.types.ts
//
// The admin land module, mirroring the backend DTOs. Money
// (prices, cost, margin) is `number | null` - redacted per financial visibility
// (though the land register is owner-only, so in practice always visible).
import type { IPaginationMeta } from "./api";

export type PlotStatus = "ARCHIVED" | "AVAILABLE" | "RESERVED" | "SOLD";
export type LandSaleStatus =
  | "CANCELLED"
  | "COMPLETED"
  | "CONFIRMED"
  | "DRAFT";

export interface ILandPlotPhoto {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ILandPlotDocument {
  id: string;
  name: string;
  createdAt: string;
}

export interface ILandPlot {
  id: string;
  reference: string;
  locationText: string;
  sizeText: string;
  sizeAcres: number | null;
  use: string | null;
  description: string | null;
  askingPriceGhs: number | null;
  purchaseCostGhs: number | null;
  marginGhs: number | null;
  status: PlotStatus;
  publishToWebsite: boolean;
  showPriceOnWebsite: boolean;
  photos: ILandPlotPhoto[];
  documents: ILandPlotDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface ILandPlotListResponse {
  message: string;
  data: ILandPlot[];
  meta: IPaginationMeta;
}
export interface ILandPlotResponse {
  message: string;
  data: { plot: ILandPlot };
}

export interface ILandPlotListQuery {
  page?: number;
  limit?: number;
  status?: PlotStatus;
  publishToWebsite?: boolean;
  search?: string;
}

export interface ICreatePlotInput {
  reference: string;
  locationText: string;
  sizeText: string;
  askingPriceGhs: number;
  sizeAcres?: number;
  use?: string;
  description?: string;
  purchaseCostGhs?: number;
  showPriceOnWebsite?: boolean;
}

export type IUpdatePlotInput = Partial<ICreatePlotInput>;

// ── Land sales ────────────────────────────────────────────────────
export interface ILandSalePayment {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  amountGhs: number | null;
  method: "BANK" | "CASH" | "MOMO";
  reference: string | null;
  paidAt: string;
}

export interface ILandSale {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  status: LandSaleStatus;
  plot: { id: string; reference: string; locationText: string };
  buyer: { id: string; name: string; phone: string | null };
  agreedPriceGhs: number | null;
  /**
   * On a CANCELLED sale, what the business kept after any refund. Null on a
   * live sale - nothing has been forfeited yet.
   */
  forfeitedGhs: number | null;
  paidGhs: number | null;
  balanceGhs: number | null;
  marginGhs: number | null;
  notes: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ILandSaleDetail extends ILandSale {
  payments: ILandSalePayment[];
}

export interface ILandSaleListResponse {
  message: string;
  data: ILandSale[];
  meta: IPaginationMeta;
}
export interface ILandSaleResponse {
  message: string;
  data: { sale: ILandSaleDetail };
}

export interface ILandSaleListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LandSaleStatus;
  buyerId?: string;
  plotId?: string;
  outstanding?: boolean;
  from?: string;
  to?: string;
}

export interface ICreateLandSaleInput {
  plotId: string;
  buyerId: string;
  agreedPriceGhs: number;
  notes?: string;
}

export interface IRecordLandPaymentInput {
  amountGhs: number;
  method: "BANK" | "CASH" | "MOMO";
  reference?: string;
  paidAt?: string;
  /** Company account the money landed in. Required for BANK/MOMO. */
  paymentAccountId?: string;
}

// ── Land sellers (who the business buys land from) ────────────────
export interface ILandSeller {
  id: string;
  name: string;
  phone: string | null;
  /** Optional - a company seller sends its paperwork by email. */
  email: string | null;
  community: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ILandSellerListResponse {
  message: string;
  data: ILandSeller[];
  meta: IPaginationMeta;
}
export interface ILandSellerResponse {
  message: string;
  data: { seller: ILandSeller };
}

export interface ILandSellerListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface ICreateLandSellerInput {
  name: string;
  phone?: string;
  email?: string;
  community?: string;
  notes?: string;
}
export interface IUpdateLandSellerInput {
  name?: string;
  phone?: string | null;
  email?: string | null;
  community?: string | null;
  notes?: string | null;
}

// ── Land acquisitions (buying a plot from a seller) ───────────────
export type LandAcquisitionStatus =
  | "AGREED"
  | "CANCELLED"
  | "COMPLETED"
  | "NEGOTIATING";

export interface ILandAcquisitionPayment {
  id: string;
  /** Human-readable payment voucher number. */
  transactionNo: string;
  /** Signed: a reversal (money returned by the seller) is negative. */
  amountGhs: number | null;
  method: "BANK" | "CASH" | "MOMO";
  reference: string | null;
  paidAt: string;
}

export interface ILandAcquisition {
  id: string;
  /** Human-readable document number, e.g. "ACQ-2026-00004". */
  transactionNo: string;
  reference: string;
  seller: { id: string; name: string; phone: string | null };
  locationText: string;
  sizeText: string;
  sizeAcres: number | null;
  use: string | null;
  description: string | null;
  agreedCostGhs: number | null;
  paidGhs: number | null;
  balanceGhs: number | null;
  status: LandAcquisitionStatus;
  notes: string | null;
  /** The plot produced on completion; null until then. */
  plot: { id: string; reference: string } | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ILandAcquisitionDetail extends ILandAcquisition {
  payments: ILandAcquisitionPayment[];
}

export interface ILandAcquisitionListResponse {
  message: string;
  data: ILandAcquisition[];
  meta: IPaginationMeta;
}
export interface ILandAcquisitionResponse {
  message: string;
  data: { acquisition: ILandAcquisitionDetail };
}

export interface ILandAcquisitionListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: LandAcquisitionStatus;
  sellerId?: string;
  outstanding?: boolean;
  from?: string;
  to?: string;
}

export interface ICreateLandAcquisitionInput {
  reference: string;
  sellerId: string;
  locationText: string;
  sizeText: string;
  agreedCostGhs: number;
  sizeAcres?: number;
  use?: string;
  description?: string;
  notes?: string;
}

export type IUpdateLandAcquisitionInput = Partial<ICreateLandAcquisitionInput>;

export interface IRecordAcquisitionPaymentInput {
  amountGhs: number;
  method: "BANK" | "CASH" | "MOMO";
  reference?: string;
  paidAt?: string;
  /** Company account the seller was paid FROM. Required for BANK/MOMO. */
  paymentAccountId?: string;
}

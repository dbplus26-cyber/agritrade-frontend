// src/types/ops.types.ts
//
// The stock-operations wave (warehouse transfers, stocktakes) plus the two
// derived money reads that shipped with it (grant aging, cashflow forecast),
// mirroring the backend DTOs. Money is `number | null` - redacted per
// financial visibility; weights and counts are always present.
import type { IPaginationMeta } from "./api";

// ── Warehouse transfers ───────────────────────────────────────────

/** One posted transfer (`TRF-…`), as listed by `/admin/stock/transfers`. */
export interface ITransfer {
  id: string;
  transactionNo: string;
  fromWarehouse: { id: string; name: string };
  toWarehouse: { id: string; name: string };
  commodity: { id: string; name: string };
  weightKg: number;
  notes: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface ITransferListResponse {
  message: string;
  data: ITransfer[];
  meta: IPaginationMeta;
}

export interface ITransferResponse {
  message: string;
  data: { transfer: ITransfer };
}

/** Mirrors backend transfer list filters (dates travel as YYYY-MM-DD). */
export interface ITransferListQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  commodityId?: string;
}

/** Mirrors backend `createTransferSchema` (super-admin only). */
export interface ICreateTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  commodityId: string;
  weightKg: number;
  notes?: string;
  occurredAt?: string;
}

// ── Stocktakes ────────────────────────────────────────────────────

/** Mirrors the backend stocktake lifecycle. */
export enum StocktakeStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  APPROVED = "APPROVED",
  CANCELLED = "CANCELLED",
}

/**
 * One counted line. `derivedKg` (the book balance) and `deltaKg` are null
 * until the sheet is submitted - submitting snapshots both per line.
 */
export interface IStocktakeLine {
  commodity: { id: string; name: string };
  countedKg: number;
  derivedKg: number | null;
  deltaKg: number | null;
}

/** One stocktake (`STK-…`), as returned by `/admin/stock/stocktakes`. */
export interface IStocktake {
  id: string;
  transactionNo: string;
  warehouse: { id: string; name: string };
  status: StocktakeStatus;
  notes: string | null;
  countedById: string;
  submittedAt: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  createdAt: string;
  lines: IStocktakeLine[];
}

export interface IStocktakeListResponse {
  message: string;
  data: IStocktake[];
  meta: IPaginationMeta;
}

export interface IStocktakeResponse {
  message: string;
  data: { stocktake: IStocktake };
}

export interface IStocktakeListQuery {
  page?: number;
  limit?: number;
  status?: StocktakeStatus;
  warehouseId?: string;
}

export interface IStocktakeLineInput {
  commodityId: string;
  countedKg: number;
}

/** Mirrors backend `createStocktakeSchema` (1-100 lines, unique commodities). */
export interface ICreateStocktakeInput {
  warehouseId: string;
  notes?: string;
  lines: IStocktakeLineInput[];
}

/** DRAFT-only edit: counts and/or notes. */
export interface IUpdateStocktakeInput {
  notes?: string;
  lines?: IStocktakeLineInput[];
}

// ── Grant aging (`/admin/farm/grants/aging`, super-admin) ─────────

export type GrantAgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

/** One farmer-season outstanding balance, sorted most-overdue first. */
export interface IGrantAgingRow {
  farmer: { id: string; name: string; phone: string | null };
  season: { id: string; name: string };
  investedGhs: number | null;
  recoveredGhs: number | null;
  outstandingGhs: number | null;
  dueDate: string | null;
  daysOverdue: number;
  bucket: GrantAgingBucket;
}

export interface IGrantAging {
  rows: IGrantAgingRow[];
  totals: Record<GrantAgingBucket, number | null>;
}

export interface IGrantAgingResponse {
  message: string;
  data: { aging: IGrantAging };
}

// ── Cashflow forecast (`/admin/reports/cashflow-forecast`) ────────

export type ForecastDays = 30 | 60 | 90;

export interface IForecastSaleRow {
  id: string;
  transactionNo: string;
  buyer: { id: string; name: string };
  status: string;
  balanceGhs: number | null;
}

export interface IForecastFarmRow {
  farmer: { id: string; name: string };
  season: { id: string; name: string };
  outstandingGhs: number | null;
  dueDate: string;
  daysOverdue: number;
}

export interface ICashflowForecast {
  days: number;
  salesReceivableGhs: number | null;
  farmDueGhs: number | null;
  saleRows: IForecastSaleRow[];
  farmRows: IForecastFarmRow[];
}

export interface ICashflowForecastResponse {
  message: string;
  data: { forecast: ICashflowForecast };
}

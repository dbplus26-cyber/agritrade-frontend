// src/types/report.types.ts
//
// The reporting reads, mirroring the backend. Money is
// `number | null` (redacted per financial visibility); weights and counts are
// always present.

import type { IPaginationMeta } from "./api";

export interface IDashboard {
  stockOnHandKg: number;
  stockByCommodity: {
    commodityId: string;
    commodityName: string;
    onHandKg: number;
  }[];
  incomingKg: number;
  incomingGhs: number | null;
  cashWithAgentsGhs: number | null;
  activeAgents: number;
  salesInProgress: number;
  salesInProgressAgreedGhs: number | null;
  debtorCount: number;
  debtorsOutstandingGhs: number | null;
  pendingApprovals: number;
}

export interface IDashboardResponse {
  message: string;
  data: IDashboard;
}

export interface ICommodityProfit {
  commodityId: string;
  commodityName: string;
  revenueGhs: number | null;
  costGhs: number | null;
  grossProfitGhs: number | null;
  estimated: boolean;
}

export interface IProfitReport {
  summary: {
    revenueGhs: number | null;
    costGhs: number | null;
    grossProfitGhs: number | null;
    expensesGhs: number | null;
    netProfitGhs: number | null;
    netMarginPct: number | null;
    hasEstimated: boolean;
  };
  byCommodity: ICommodityProfit[];
}

export interface IProfitReportResponse {
  message: string;
  data: IProfitReport;
}

export interface IExpenseSummary {
  byCategory: {
    categoryId: string;
    categoryName: string;
    amountGhs: number | null;
  }[];
  totalGhs: number | null;
}

export interface IExpenseSummaryResponse {
  message: string;
  data: IExpenseSummary;
}

export interface IAgentPerformanceRow {
  agentName: string;
  purchases: number;
  weightKg: number;
  avgPriceGhs: number | null;
  spentGhs: number | null;
}

export interface IAgentPerformanceResponse {
  message: string;
  data: IAgentPerformanceRow[];
}

export interface ITrendPoint {
  month: string;
  purchasesGhs: number | null;
  salesGhs: number | null;
}

export interface ITrendsResponse {
  message: string;
  data: ITrendPoint[];
}

export interface IReportWindow {
  from?: string;
  to?: string;
}

// ── Windowed dashboard reads (period summary, cashflow, volume, activity) ──

/** Period-over-period change carried by the windowed KPIs. */
export interface ITrend {
  direction: "down" | "neutral" | "up";
  percentage: number;
}

/** The windowed flow strip: money out/in and sales confirmed over the window. */
export interface IPeriodSummary {
  expensesGhs: number | null;
  from: string;
  paymentsInGhs: number | null;
  paymentsInTrend: ITrend;
  purchaseCount: number;
  purchasesGhs: number | null;
  purchasesKg: number;
  purchasesTrend: ITrend;
  salesConfirmedCount: number;
  salesConfirmedGhs: number | null;
  salesConfirmedTrend: ITrend;
  to: string;
}

export interface IPeriodSummaryResponse {
  data: IPeriodSummary;
  message: string;
}

export type BucketGranularity = "day" | "month" | "week";

export interface ICashflowPoint {
  label: string;
  purchasesOutGhs: number | null;
  salesInGhs: number | null;
}

export interface ICashflow {
  granularity: BucketGranularity;
  points: ICashflowPoint[];
}

export interface ICashflowResponse {
  data: ICashflow;
  message: string;
}

export interface IVolumePoint {
  label: string;
  /** kg per commodity name; keys match `commodities[].name`. */
  values: Record<string, number>;
}

export interface IVolume {
  commodities: { id: string; name: string }[];
  granularity: BucketGranularity;
  points: IVolumePoint[];
}

export interface IVolumeResponse {
  data: IVolume;
  message: string;
}

export interface IActivityItem {
  action: string;
  actorName: string;
  at: string;
  entity: string;
  entityId: string | null;
  id: string;
}

export interface IActivityResponse {
  data: IActivityItem[];
  message: string;
}

export interface IDebtorRow {
  agreedGhs: number | null;
  balanceGhs: number | null;
  buyer: { id: string; name: string; phone: string | null };
  id: string;
  kind: "COMMODITY" | "LAND";
  paidGhs: number | null;
  status: string;
  subject: string;
}

export interface IDebtorsResponse {
  data: IDebtorRow[];
  message: string;
  meta: IPaginationMeta;
}

export interface IDebtorsQuery {
  limit?: number;
  page?: number;
  search?: string;
}

/**
 * One commodity's purchase book for a year, mirroring the backend
 * `purchase-book.service.ts`. A row is either a purchase or a day's cash paid
 * for purchases; `balanceCashGhs` runs paid minus payable.
 */
export interface IPurchaseBookRow {
  kind: "CASH" | "PURCHASE" | "SALE";
  date: string;
  particulars: string;
  /** The purchase's or sale's document number; null on a cash row. */
  reference: string | null;
  documentId: string | null;
  bags: number | null;
  priceGhs: number | null;
  weightKg: number | null;
  payableGhs: number | null;
  advanceGhs: number | null;
  balanceCashGhs: number | null;
  fmPercent: number | null;
  dispatchedBags: number | null;
  dispatchedKg: number | null;
  balanceBags: number | null;
  balanceKg: number | null;
  fmDeductionPct: number | null;
  fmDeductionKg: number | null;
}

/** One commodity's year with suppliers (PURCHASE) or with buyers (SALE). */
export interface IPurchaseBook {
  side: "PURCHASE" | "SALE";
  /** The one supplier or buyer the book is narrowed to; null is everyone. */
  party: { id: string; name: string } | null;
  /** Carries the FM rule of this side: buying or selling. */
  commodity: {
    id: string;
    name: string;
    fmStandardPct: number | null;
    fmTolerancePct: number | null;
  };
  year: number;
  rows: IPurchaseBookRow[];
  totals: {
    bags: number;
    avgPriceGhs: number | null;
    weightKg: number;
    payableGhs: number | null;
    advanceGhs: number | null;
    balanceCashGhs: number | null;
    dispatchedBags: number;
    dispatchedKg: number;
    balanceBags: number;
    balanceKg: number;
    fmDeductionKg: number;
  };
}

/** One page of the book's rows; `data.totals` cover the whole book. */
export interface IPurchaseBookResponse {
  message: string;
  data: IPurchaseBook;
  meta: IPaginationMeta;
}

export type DataExportStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

/**
 * A file too long to build while the page waits: prepared in the background
 * and collected from the Exports page. A long book is several files.
 */
export interface IDataExport {
  id: string;
  type: "PURCHASE_BOOK" | "SALES_BOOK";
  status: DataExportStatus;
  /** "Soya Purchase Book 2026 - Ibrahim". */
  title: string;
  /** Rows written so far, of `totalRows`. */
  rowCount: number;
  totalRows: number;
  /** Each downloaded by its part number, through the API. */
  files: { name: string; part: number; rows: number }[];
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  /** When the files are deleted. */
  expiresAt: string | null;
}

/** Which book to hand over as a file. */
export interface IBookExportRequest {
  side: "PURCHASE" | "SALE";
  commodityId: string;
  /** A supplier or a buyer; left out for everyone. */
  partyId?: string;
  year: number;
}

/** `export: null`: the book is short, download it now. Otherwise it is queued. */
export interface IBookExportResponse {
  message: string;
  data: { export: IDataExport | null };
}

export interface IDataExportListResponse {
  message: string;
  data: IDataExport[];
  meta: IPaginationMeta;
}

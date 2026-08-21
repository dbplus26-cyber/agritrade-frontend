import type { IPaginationMeta } from "./api";

/**
 * The stock ledger, mirroring the backend `stock.mapper.ts` and the
 * `/admin/stock` surface. Balances are always derived server-side from the
 * sum of movements - the client never computes stock.
 */

/** Mirrors the backend `StockMoveType` enum. */
export enum StockMoveType {
  PURCHASE_RECEIPT = "PURCHASE_RECEIPT",
  SHIPMENT_LOAD = "SHIPMENT_LOAD",
  ADJUSTMENT = "ADJUSTMENT",
  TRANSFER_IN = "TRANSFER_IN",
  TRANSFER_OUT = "TRANSFER_OUT",
  FARM_REPAYMENT_RECEIPT = "FARM_REPAYMENT_RECEIPT",
}

/** One (warehouse, commodity) derived balance row. */
export interface IStockBalance {
  balanceKg: number;
  commodityId: string;
  commodityName: string;
  warehouseId: string;
  warehouseName: string;
}

/** Per-commodity totals across all warehouses (the headline strip). */
export interface IStockCommodityTotal {
  commodityId: string;
  commodityName: string;
  totalKg: number;
}

export interface IStockBalancesResponse {
  message: string;
  data: IStockBalance[];
  summary: { totals: IStockCommodityTotal[] };
}

export interface IStockBalancesQuery {
  warehouseId?: string;
  commodityId?: string;
  includeZero?: boolean;
}

/** One stock ledger entry as shown in the movements register. */
export interface IStockMovement {
  id: string;
  type: StockMoveType;
  deltaKg: number;
  commodity: { id: string; name: string };
  warehouse: { id: string; name: string };
  purchaseId: string | null;
  reason: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface IStockMovementsResponse {
  message: string;
  data: IStockMovement[];
  meta: IPaginationMeta;
}

/** Mirrors backend `stockMovementsQuery` (dates travel as YYYY-MM-DD). */
export interface IStockMovementsQuery {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  commodityId?: string;
  type?: StockMoveType;
  from?: string;
  to?: string;
}

/** Mirrors backend `requestAdjustmentSchema`; deltaKg is signed. */
export interface IRequestAdjustmentInput {
  warehouseId: string;
  commodityId: string;
  deltaKg: number;
  reason: string;
}

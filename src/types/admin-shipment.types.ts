// src/types/admin-shipment.types.ts
//
// The admin shipments surface (design doc 5.4, 5.6), mirroring the backend
// DTOs. Money fields (lot costs, expenses, profit) are `number | null` -
// redacted for callers without financial visibility (8.3); weights and the
// goods manifest are operational and always present.
import type { IPaginationMeta } from "./api";

export type ShipmentStatus =
  | "ARRIVED"
  | "CANCELLED"
  | "CLOSED"
  | "DISPATCHED"
  | "LOADING"
  | "PLANNED";

export interface IShipmentAllocation {
  id: string;
  lotId: string;
  commodity: { id: string; name: string };
  weightKg: number;
  unitCostSnapshotGhs: number | null;
  lineCostGhs: number | null;
}

export interface IShipmentExpense {
  id: string;
  category: { id: string; name: string };
  amountGhs: number | null;
  description: string | null;
  incurredAt: string;
}

export interface IManifestLine {
  commodity: string;
  weightKg: number;
}

export interface IShipment {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  status: ShipmentStatus;
  sale: {
    id: string;
    transactionNo: string;
    buyer: { id: string; name: string; phone: string | null };
  };
  originWarehouse: { id: string; name: string };
  destination: string;
  truckReg: string;
  truckCapacityKg: number | null;
  driverName: string;
  driverPhone: string | null;
  costBasis: string;
  totalWeightKg: number;
  manifest: IManifestLine[];
  allocations: IShipmentAllocation[];
  expenses: IShipmentExpense[];
  profit: {
    costBasis: string;
    revenueGhs: number | null;
    costGhs: number | null;
    expensesGhs: number | null;
    profitGhs: number | null;
  };
  notes: string | null;
  cancelReason: string | null;
  expectedArrivalAt: string | null;
  departedAt: string | null;
  arrivedAt: string | null;
  closedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IAvailableLot {
  id: string;
  commodity: { id: string; name: string };
  remainingKg: number;
  unitCostGhs: number | null;
}

export interface IShipmentListResponse {
  message: string;
  data: IShipment[];
  meta: IPaginationMeta;
}

export interface IShipmentResponse {
  message: string;
  data: { shipment: IShipment };
}

export interface IAvailableLotsResponse {
  message: string;
  data: { lots: IAvailableLot[] };
}

export interface IShipmentListQuery {
  page?: number;
  limit?: number;
  status?: ShipmentStatus;
  saleId?: string;
  originWarehouseId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface ICreateShipmentInput {
  saleId: string;
  originWarehouseId: string;
  destination: string;
  truckReg: string;
  driverName: string;
  driverPhone?: string;
  truckCapacityKg?: number;
  expectedArrivalAt?: string;
  notes?: string;
}

export interface IAllocationInput {
  lotId: string;
  weightKg: number;
}

export interface IShipmentExpenseInput {
  categoryId: string;
  amountGhs: number;
  description?: string;
  incurredAt?: string;
}

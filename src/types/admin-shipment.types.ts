// src/types/admin-shipment.types.ts
//
// The admin shipments surface (design doc 5.4, 5.6), mirroring the backend
// DTOs. Money fields (lot costs, expenses, profit) are `number | null` -
// redacted for callers without financial visibility (8.3); weights and the
// goods manifest are operational and always present.
import type { IPaginationMeta } from "./api";
import type { SaleStatus } from "./admin-sale.types";

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
  /** The sale this slice fulfils (null on legacy rows). */
  sale: { id: string; transactionNo: string };
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

/** A sale carried on a shipment. Paid/balance are non-null only on detail
 * reads; every money field is null when redacted (financial visibility). */
/** What one sale on this truck needs, per commodity. */
export interface IShipmentSaleLine {
  commodityId: string;
  commodityName: string;
  /** Weight the sale agreed to, across all trucks. */
  agreedKg: number;
  /** Weight already allocated to this sale on THIS shipment. */
  allocatedKg: number;
  /** agreed - allocated here, floored at zero. */
  outstandingKg: number;
}

export interface IShipmentSale {
  id: string;
  transactionNo: string;
  lines: IShipmentSaleLine[];
  status: SaleStatus;
  buyer: { id: string; name: string; phone: string | null };
  agreedTotalGhs: number | null;
  paidGhs: number | null;
  balanceGhs: number | null;
}

/** A private shipment document (e.g. the signed waybill). */
export interface IShipmentDocument {
  id: string;
  name: string;
  createdAt: string;
}

/** The saved delivery address snapshot carried on a shipment (null when the
 * destination was entered as free text). */
export interface IShipmentDeliveryAddress {
  id: string;
  label: string;
  city: string;
  area: string | null;
  digitalAddress: string | null;
  landmark: string | null;
  shopName: string | null;
  contactName: string | null;
  contactPhone: string | null;
  directions: string | null;
}

export interface IShipment {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  status: ShipmentStatus;
  /** One or more sales this truck fulfils. */
  sales: IShipmentSale[];
  salesCount: number;
  originWarehouse: { id: string; name: string };
  destination: string;
  /** The saved delivery address the destination came from, if any. */
  deliveryAddress: IShipmentDeliveryAddress | null;
  truckReg: string;
  truckCapacityKg: number | null;
  /** The drivers-directory record the snapshot came from, if any. */
  driverId: string | null;
  driverName: string;
  driverPhone: string | null;
  driverEmail: string | null;
  driverCompany: string | null;
  driverCity: string | null;
  driverLicenseNo: string | null;
  driverIdNumber: string | null;
  documents: IShipmentDocument[];
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

/** One commodity line on an eligible (shippable) sale. */
export interface IEligibleSaleLine {
  commodityId: string;
  commodityName: string;
  agreedKg: number;
  /** Weight still to ship after past dispatches. */
  remainingKg: number;
}

/**
 * A sale that can go on a new truck: CONFIRMED, payment terms met, not fully
 * shipped and not already planned onto an active shipment. Money fields are
 * null when redacted (financial visibility).
 */
export interface IEligibleSale {
  id: string;
  transactionNo: string;
  buyer: { id: string; name: string };
  agreedTotalGhs: number | null;
  paidGhs: number | null;
  requiredBeforeLoadingGhs: number | null;
  totalRemainingKg: number;
  lines: IEligibleSaleLine[];
}

export interface IEligibleSalesResponse {
  message: string;
  data: { sales: IEligibleSale[] };
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
  /** The confirmed sales this truck fulfils (1-20). */
  saleIds: string[];
  originWarehouseId: string;
  /** Free-text destination; optional when `deliveryAddressId` is given. */
  destination?: string;
  /** A saved delivery address to ship to (snapshots onto the shipment). */
  deliveryAddressId?: string;
  truckReg: string;
  /** A drivers-directory record; backfills the driver snapshot server-side. */
  driverId?: string;
  /** Required unless `driverId` is given; overrides the directory snapshot. */
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
  driverCompany?: string;
  driverCity?: string;
  driverLicenseNo?: string;
  driverIdNumber?: string;
  truckCapacityKg?: number;
  expectedArrivalAt?: string;
  notes?: string;
}

export interface IAllocationInput {
  lotId: string;
  /** The sale this slice fulfils - required by the backend. */
  saleId: string;
  weightKg: number;
}

export interface IDispatchShipmentInput {
  id: string;
  departedAt?: string;
  /** Dispatch even though no signed waybill has been uploaded. */
  overrideMissingWaybill?: boolean;
}

export interface IShipmentExpenseInput {
  categoryId: string;
  amountGhs: number;
  description?: string;
  incurredAt?: string;
}

// src/types/admin-shipment.types.ts
//
// The admin shipments surface, mirroring the backend DTOs. Money fields (lot
// costs, expenses, profit) are `number | null` - redacted for callers without
// financial visibility; weights and the goods manifest are operational and
// always present.
import type { ExpensePaymentBody } from "@/validations/expense-payment-fields";
import type { IPaginationMeta } from "./api";
import type { SaleStatus } from "./admin-sale.types";

export type ShipmentStatus =
  | "ARRIVED"
  | "CANCELLED"
  | "CLOSED"
  | "DISPATCHED"
  | "LOADING"
  | "PLANNED";

/**
 * Where a lot is held. Most goods sit in a shed; a load bought for a straight
 * run to the buyer never enters one and stands with the seller until a truck
 * collects it, so the picker, the waybill and every refusal that names a place
 * have to be able to say either.
 */
export interface ILotSource {
  id: string;
  kind: "SUPPLIER" | "WAREHOUSE";
  name: string;
}

export interface IShipmentAllocation {
  id: string;
  lotId: string;
  commodity: { id: string; name: string };
  weightKg: number;
  unitCostSnapshotGhs: number | null;
  lineCostGhs: number | null;
  /** The sale this slice fulfils (null on legacy rows). */
  sale: { id: string; transactionNo: string };
  /** Where these goods were picked up. */
  source: ILotSource;
}

export interface IShipmentExpense {
  id: string;
  category: { id: string; name: string };
  amountGhs: number | null;
  description: string | null;
  incurredAt: string;
  /**
   * Whether the money has actually gone. The STATUS survives redaction while
   * the figures do not: somebody without money access still has to be able to
   * see that a trip cost is outstanding.
   */
  settlement: {
    outstandingGhs: number | null;
    paidGhs: number | null;
    status: "PAID" | "PART_PAID" | "UNPAID";
  };
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

/** What one commodity on one sale weighed in at, against what left. */
export interface IShipmentArrivalLine {
  commodityId: string;
  commodityName: string;
  /** What went on the truck for this sale. */
  dispatchedKg: number;
  /** What came off it at the other end. */
  receivedKg: number;
  /** The shortfall valued at what those goods cost us. Redacted money. */
  lossValueGhs: number | null;
}

export interface IShipmentSale {
  id: string;
  transactionNo: string;
  lines: IShipmentSaleLine[];
  /** What came off the truck for this sale. Empty until it is weighed in. */
  arrivalLines: IShipmentArrivalLine[];
  status: SaleStatus;
  buyer: { id: string; name: string; phone: string | null };
  agreedTotalGhs: number | null;
  /** What the buyer will pay once this trip's load was re-weighed. Null until
   * the arrival figures are recorded; null is NOT zero. */
  settledTotalGhs: number | null;
  paidGhs: number | null;
  /** The API's agreed-based balance. Prefer `saleBalanceGhs()`. */
  balanceGhs: number | null;
}

/** A private shipment document (e.g. the signed waybill). */
export interface IShipmentDocument {
  id: string;
  name: string;
  createdAt: string;
}

/** Which waybill slot a mark sits in. */
export type ShipmentSignatureRole = "DRIVER" | "OWNER";

/**
 * Where the mark came from. DRAWN was made on a device at signing time,
 * UPLOADED is a photo or scan of a wet signature, SAVED is the owner's stored
 * mark applied deliberately to this trip. SAVED is the weakest of the three -
 * it proves a decision to sign, not a hand moving - and the console says so
 * rather than presenting all three as the same thing.
 */
export type ShipmentSignatureSource = "DRAWN" | "SAVED" | "UPLOADED";

/**
 * One party's captured signature on a trip's waybill.
 *
 * `capturedByName` is not decoration. A driver has no login, so a staff member
 * always holds the device - and naming them is the whole difference between
 * "the driver signed" and "somebody drew a squiggle". It is shown beside the
 * mark for exactly that reason.
 */
export interface IShipmentSignature {
  /** Who held the device. Not the signer. */
  capturedByName: string;
  id: string;
  imageUrl: string;
  /**
   * True when the truck's load or details moved after this was signed. The
   * mark still stands for what it was given for; this says it is no longer
   * the load on the sheet.
   */
  manifestChanged: boolean;
  role: ShipmentSignatureRole;
  signedAt: string;
  signedName: string;
  source: ShipmentSignatureSource;
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
  /** Null on a trip that only collects at the farm gate. */
  originWarehouse: { id: string; name: string } | null;
  /**
   * Every shed this truck calls at to take loads, origin first. Empty on a
   * trip that loads nothing out of a warehouse.
   */
  loadingWarehouses: { id: string; name: string }[];
  /**
   * Suppliers the truck collects from. Goods bought for a straight run to the
   * buyer never enter a shed, and this is where they are picked up.
   */
  pickupSuppliers: { id: string; name: string }[];
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
  /** The two waybill slots. Null means nobody has signed that one yet. */
  signatures: {
    driver: IShipmentSignature | null;
    owner: IShipmentSignature | null;
  };
  costBasis: string;
  /** Weight allocated from lots so far - what has been keyed in. */
  totalWeightKg: number;
  /**
   * Unshipped weight the sales on this truck are due to move - the figure to
   * measure `truckCapacityKg` against, and what the backend's OVER_CAPACITY
   * refusal uses. It cannot be derived here: a sale's `agreedKg` is its weight
   * across ALL trucks, so a part-shipped sale would read too heavy. Null on
   * list reads, where the server does not pay for it.
   */
  plannedWeightKg: number | null;
  manifest: IManifestLine[];
  allocations: IShipmentAllocation[];
  expenses: IShipmentExpense[];
  /**
   * The trip's money, on the same basis the profit report uses. Revenue is
   * stated twice because the business bought what LEFT and is paid for what
   * ARRIVED: cost stays whole either way, and the gap between the two is what
   * the road cost, not a discount.
   */
  profit: {
    costBasis: string;
    /** Revenue on the arrival weight, falling back to the loaded one. */
    revenueGhs: number | null;
    /** Revenue on the loaded weight: what the sales were struck at. */
    revenueAgreedGhs: number | null;
    costGhs: number | null;
    /** Inside costGhs and stated apart: what the goods brought with them. */
    acquisitionGhs: number | null;
    expensesGhs: number | null;
    profitGhs: number | null;
    /** What the trip was expected to make when it was loaded. */
    profitAgreedGhs: number | null;
    /** Null until something on this trip has been re-weighed. */
    transitLossGhs: number | null;
    transitLossKg: number | null;
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
  /** Where the goods stand - the picker groups by it. */
  source: ILotSource;
  id: string;
  commodity: { id: string; name: string };
  remainingKg: number;
  unitCostGhs: number | null;
  /** The consignment a farm-gate lot came off, so two are tellable apart. */
  purchaseNo: string | null;
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
  /** Optional: a trip that only collects at the farm gate starts at no shed. */
  originWarehouseId?: string;
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
  /** Further sheds the truck also loads at, beyond the origin (max 10). */
  loadingWarehouseIds?: string[];
  /** Suppliers the truck collects from on the way (max 10). */
  pickupSupplierIds?: string[];
  expectedArrivalAt?: string;
  notes?: string;
}

/**
 * Edit a PLANNED/LOADING shipment. Mirrors the backend's
 * updateShipmentSchema: everything optional; `deliveryAddressId`/`driverId`
 * accept null to detach; `loadingWarehouseIds` replaces the shed list
 * (the origin is always kept).
 */
export interface IUpdateShipmentInput {
  id: string;
  destination?: string;
  deliveryAddressId?: string | null;
  truckReg?: string;
  driverId?: string | null;
  driverName?: string;
  driverPhone?: string;
  driverEmail?: string;
  driverCompany?: string;
  driverCity?: string;
  driverLicenseNo?: string;
  driverIdNumber?: string;
  truckCapacityKg?: number | null;
  loadingWarehouseIds?: string[];
  pickupSupplierIds?: string[];
  expectedArrivalAt?: string | null;
  notes?: string | null;
}

/** Attach further confirmed sales to a shipment that has not dispatched. */
export interface IAddShipmentSalesInput {
  id: string;
  saleIds: string[];
}

export interface IRemoveShipmentSaleInput {
  id: string;
  saleId: string;
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

/** What one commodity on one sale actually weighed when it came off the truck. */
export interface IArrivalLineInput {
  commodityId: string;
  /** Zero is accepted (a load that never turned up); negative is refused. */
  receivedKg: number;
}

/** The arrival figures for one sale on the trip. */
export interface IArrivalSaleInput {
  saleId: string;
  lines: IArrivalLineInput[];
  /**
   * What the buyer will actually pay. Entered, never derived: received x
   * agreed price is the suggestion, and the two sides often settle on a round
   * figure after arguing about a wet load.
   */
  settledTotalGhs: number;
}

/**
 * The figures for a trip already marked arrived, or a correction to ones
 * recorded earlier. `sales` is required: this request is nothing but the
 * figures, so an empty one is a mistake rather than the "not weighed yet"
 * case the arrival itself allows.
 */
export interface IRecordArrivalInput {
  id: string;
  sales: IArrivalSaleInput[];
}

/**
 * Mark a dispatched trip arrived. `sales` is optional: the load is on the
 * ground whether or not anybody has weighed it yet, and the figures can be
 * recorded later.
 */
export interface IArriveShipmentInput {
  id: string;
  arrivedAt?: string;
  sales?: IArrivalSaleInput[];
}

export interface IShipmentExpenseInput {
  categoryId: string;
  amountGhs: number;
  description?: string;
  incurredAt?: string;
  /**
   * Settling it in the same act. Absent means the cost is recorded as owed and
   * nothing leaves an account; it is then paid from its own voucher.
   */
  payment?: ExpensePaymentBody;
}

/**
 * Capturing one party's mark. `file` is required for the driver and optional
 * for the owner, where leaving it off applies the signature saved in Settings -
 * which is the whole reason for saving one.
 */
export interface ISignShipmentInput {
  file?: File;
  id: string;
  /** Defaults server-side: the trip's driver, or the signed-in owner. */
  signedName?: string;
}

/** Striking a mark off a trip. Owner only, and the reason stays on the row. */
export interface IRevokeSignatureInput {
  id: string;
  reason: string;
  role: "driver" | "owner";
}

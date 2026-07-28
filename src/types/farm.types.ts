// src/types/farm.types.ts
//
// The admin farm investment module (design doc 5.11), mirroring the backend
// DTOs. Money (grant/repayment values, plan expectations, balances) is
// `number | null` - redacted per financial visibility, though the whole farm
// namespace is owner-only so in practice always visible.
import type { IPaginationMeta } from "./api";

// ── Seasons ───────────────────────────────────────────────────────
export interface ISeason {
  id: string;
  name: string;
  startsOn: string;
  endsOn: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface ISeasonListResponse {
  message: string;
  data: ISeason[];
  meta: IPaginationMeta;
}
export interface ISeasonResponse {
  message: string;
  data: { season: ISeason };
}
export interface ISeasonListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}
export interface ICreateSeasonInput {
  name: string;
  startsOn: string;
  endsOn?: string;
}
export type IUpdateSeasonInput = Partial<ICreateSeasonInput>;

// ── Input items ───────────────────────────────────────────────────
export interface IInputItem {
  id: string;
  name: string;
  unitLabel: string;
  /** What the item actually is - "NPK 15-15-15, 50kg bag" beats a bare name. */
  description: string | null;
  isActive: boolean;
  createdAt: string;
}
export interface IInputItemListResponse {
  message: string;
  data: IInputItem[];
  meta: IPaginationMeta;
}
export interface IInputItemResponse {
  message: string;
  data: { item: IInputItem };
}
export interface IInputItemListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}
export interface ICreateInputItemInput {
  name: string;
  unitLabel: string;
  description?: string;
}
export interface IUpdateInputItemInput {
  name?: string;
  unitLabel?: string;
  /** null clears it; undefined leaves it untouched. */
  description?: string | null;
}

// ── Farmers ───────────────────────────────────────────────────────
export interface IFarmerDocument {
  id: string;
  name: string;
  createdAt: string;
}
/** Mirrors the backend `FarmerGuarantor` rows on `toFarmerDTO`. */
export interface IFarmerGuarantor {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  relationship: string | null;
  idType: string | null;
  idNumber: string | null;
  occupation: string | null;
  notes: string | null;
  createdAt: string;
}
export interface IFarmer {
  id: string;
  name: string;
  phone: string | null;
  community: string | null;
  notes: string | null;
  photoUrl: string | null;
  /** Grant-readiness profile (backend `toFarmerDTO`). */
  address: string | null;
  idType: string | null;
  idNumber: string | null;
  dateOfBirth: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  farmLocation: string | null;
  farmSizeAcres: number | null;
  momoNumber: string | null;
  isActive: boolean;
  documents: IFarmerDocument[];
  guarantors: IFarmerGuarantor[];
  createdAt: string;
}
export interface IFarmerListResponse {
  message: string;
  data: IFarmer[];
  meta: IPaginationMeta;
}
export interface IFarmerResponse {
  message: string;
  data: { farmer: IFarmer };
}
export interface IFarmerListQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}
export interface ICreateFarmerInput {
  name: string;
  phone?: string;
  community?: string;
  notes?: string;
  address?: string;
  idType?: string;
  idNumber?: string;
  dateOfBirth?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  farmLocation?: string;
  farmSizeAcres?: number;
  momoNumber?: string;
}
export type IUpdateFarmerInput = Partial<ICreateFarmerInput>;

/** Mirrors backend `createGuarantorSchema` / `updateGuarantorSchema`. */
export interface IGuarantorInput {
  name: string;
  phone?: string;
  address?: string;
  relationship?: string;
  idType?: string;
  idNumber?: string;
  occupation?: string;
  notes?: string;
}

// ── Input grants ──────────────────────────────────────────────────
export interface IGrantApproval {
  id: string;
  status: string;
}
/** Grant/repayment evidence documents share the farmer-document shape. */
export type IGrantDocument = IFarmerDocument;
export interface IGrant {
  id: string;
  transactionNo: string;
  farmer: { id: string; name: string };
  season: { id: string; name: string };
  item: { id: string; name: string; unitLabel: string };
  quantity: number;
  valueGhs: number | null;
  notes: string | null;
  agreedTerms: string | null;
  dueDate: string | null;
  documents: IGrantDocument[];
  grantedAt: string;
  createdAt: string;
  approval: IGrantApproval | null;
}
/** `GET admin/farm/grants/:id` - the full "who took what" view. */
export interface IGrantDetail extends Omit<IGrant, "farmer"> {
  farmer: {
    id: string;
    name: string;
    phone: string | null;
    community: string | null;
    photoUrl: string | null;
  };
  seasonBalance: {
    investedGhs: number | null;
    recoveredGhs: number | null;
    outstandingGhs: number | null;
  };
}
export interface IGrantListResponse {
  message: string;
  data: IGrant[];
  meta: IPaginationMeta;
}
export interface IGrantResponse {
  message: string;
  data: { grant: IGrant };
}
export interface IGrantDetailResponse {
  message: string;
  data: { grant: IGrantDetail };
}
export interface IGrantListQuery {
  page?: number;
  limit?: number;
  farmerId?: string;
  seasonId?: string;
  from?: string;
  to?: string;
}
/** Mirrors backend `createGrantSchema`; sent as multipart with the required
 * signed `agreement` file part. */
export interface ICreateGrantInput {
  farmerId: string;
  seasonId: string;
  itemId: string;
  quantity: number;
  valueGhs: number;
  notes?: string;
  grantedAt?: string;
  agreedTerms?: string;
  dueDate?: string;
  documentName?: string;
}

// ── Produce repayments ────────────────────────────────────────────
export interface IRepayment {
  id: string;
  transactionNo: string;
  farmer: { id: string; name: string };
  season: { id: string; name: string };
  commodity: { id: string; name: string };
  weightKg: number;
  ratePerKgGhs: number | null;
  valueGhs: number | null;
  intoStock: boolean;
  notes: string | null;
  receivedByName: string | null;
  documents: IGrantDocument[];
  receivedAt: string;
  createdAt: string;
}
/** `GET admin/farm/repayments/:id` - evidence plus who recorded it. */
export interface IRepaymentDetail extends Omit<IRepayment, "farmer"> {
  farmer: {
    id: string;
    name: string;
    phone: string | null;
    community: string | null;
    photoUrl: string | null;
  };
  intakeWarehouse: { id: string; name: string } | null;
  recordedBy: { id: string; name: string } | null;
}
export interface IRepaymentListResponse {
  message: string;
  data: IRepayment[];
  meta: IPaginationMeta;
}
export interface IRepaymentResponse {
  message: string;
  data: { repayment: IRepayment };
}
export interface IRepaymentDetailResponse {
  message: string;
  data: { repayment: IRepaymentDetail };
}
export interface IRepaymentListQuery {
  page?: number;
  limit?: number;
  farmerId?: string;
  seasonId?: string;
  from?: string;
  to?: string;
}
/** Mirrors backend `createRepaymentSchema`; sent as multipart with the
 * required signed `receipt` file part. */
export interface ICreateRepaymentInput {
  farmerId: string;
  seasonId: string;
  commodityId: string;
  weightKg: number;
  ratePerKgGhs: number;
  intakeWarehouseId?: string;
  notes?: string;
  receivedAt?: string;
  receivedByName?: string;
  documentName?: string;
}

// ── Farmer season plans ───────────────────────────────────────────
export interface IFarmerPlan {
  id: string;
  farmerId: string;
  seasonId: string;
  expectedYieldKg: number | null;
  expectedReturnGhs: number | null;
  notes: string | null;
}
export interface IFarmerPlanResponse {
  message: string;
  data: { plan: IFarmerPlan | null };
}
export interface IUpsertPlanInput {
  farmerId: string;
  seasonId: string;
  expectedYieldKg?: number | null;
  expectedReturnGhs?: number | null;
  notes?: string | null;
}

// ── Derived reporting ─────────────────────────────────────────────
export interface IFarmerBalance {
  farmerId: string;
  farmerName: string;
  investedGhs: number | null;
  recoveredGhs: number | null;
  outstandingGhs: number | null;
}
export interface ISeasonSummary {
  season: { id: string; name: string };
  farmerCount: number;
  investedGhs: number | null;
  recoveredGhs: number | null;
  outstandingGhs: number | null;
  /** Plans vs reality: what the season promised against what came back. */
  expectations: {
    expectedYieldKg: number;
    actualYieldKg: number;
    expectedReturnGhs: number | null;
    actualReturnGhs: number | null;
  };
  farmerBalances: IFarmerBalance[];
}
export interface ISeasonSummaryResponse {
  message: string;
  data: { summary: ISeasonSummary };
}

export interface IStatementRow {
  at: string;
  kind: "grant" | "repayment";
  detail: string;
  season: string;
  deltaGhs: number | null;
  balanceAfterGhs: number | null;
}
export interface IFarmerStatement {
  farmer: { id: string; name: string };
  /** Closing balance: the farmer's whole position at the end of the window. */
  balanceGhs: number | null;
  /**
   * Everything before the window opens, summed. A statement that starts
   * mid-history and runs its total from zero is a lie, so the running balance
   * starts here.
   */
  openingBalanceGhs: number | null;
  rows: IStatementRow[];
  window: { from: string | null; to: string | null };
}
export interface IFarmerStatementResponse {
  message: string;
  data: { statement: IFarmerStatement };
}

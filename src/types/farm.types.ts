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
  isActive: boolean;
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
}
export type IUpdateInputItemInput = Partial<ICreateInputItemInput>;

// ── Farmers ───────────────────────────────────────────────────────
export interface IFarmerDocument {
  id: string;
  name: string;
  createdAt: string;
}
export interface IFarmer {
  id: string;
  name: string;
  phone: string | null;
  community: string | null;
  notes: string | null;
  photoUrl: string | null;
  isActive: boolean;
  documents: IFarmerDocument[];
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
}
export type IUpdateFarmerInput = Partial<ICreateFarmerInput>;

// ── Input grants ──────────────────────────────────────────────────
export interface IGrantApproval {
  id: string;
  status: string;
}
export interface IGrant {
  id: string;
  farmer: { id: string; name: string };
  season: { id: string; name: string };
  item: { id: string; name: string; unitLabel: string };
  quantity: number;
  valueGhs: number | null;
  notes: string | null;
  grantedAt: string;
  approval: IGrantApproval | null;
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
export interface IGrantListQuery {
  page?: number;
  limit?: number;
  farmerId?: string;
  seasonId?: string;
  from?: string;
  to?: string;
}
export interface ICreateGrantInput {
  farmerId: string;
  seasonId: string;
  itemId: string;
  quantity: number;
  valueGhs: number;
  notes?: string;
  grantedAt?: string;
}

// ── Produce repayments ────────────────────────────────────────────
export interface IRepayment {
  id: string;
  farmer: { id: string; name: string };
  season: { id: string; name: string };
  commodity: { id: string; name: string };
  weightKg: number;
  ratePerKgGhs: number | null;
  valueGhs: number | null;
  intoStock: boolean;
  notes: string | null;
  receivedAt: string;
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
export interface IRepaymentListQuery {
  page?: number;
  limit?: number;
  farmerId?: string;
  seasonId?: string;
  from?: string;
  to?: string;
}
export interface ICreateRepaymentInput {
  farmerId: string;
  seasonId: string;
  commodityId: string;
  weightKg: number;
  ratePerKgGhs: number;
  intakeWarehouseId?: string;
  notes?: string;
  receivedAt?: string;
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
  balanceGhs: number | null;
  rows: IStatementRow[];
}
export interface IFarmerStatementResponse {
  message: string;
  data: { statement: IFarmerStatement };
}

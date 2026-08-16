import type { StatementSection } from "@/lib/statement-section";

import type { IPaginationMeta } from "./api";

/**
 * The registry vocabulary every ledger references by id, mirroring the
 * backend mappers in agritrade-backend `src/utils/mappers/` - commodities,
 * warehouses, suppliers, buyers and expense categories, all owner-managed.
 */

/** Mirrors the backend `PurchaseSource` enum. */
export enum PurchaseSource {
  INDIVIDUAL = "INDIVIDUAL",
  COMPANY = "COMPANY",
  AGENT = "AGENT",
}

/** Mirrors `toCommodityDTO` (backend commodity.mapper.ts). */
export interface ICommodity {
  id: string;
  name: string;
  variety: string | null;
  qualityGrade: string | null;
  description: string | null;
  /** Display convention only - kg stays the one true stock unit. */
  bagWeightKg: number | null;
  photo: string | null;
  publishToWebsite: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface IWarehouse {
  id: string;
  name: string;
  /** What the shed is for - commodities held, capacity, fumigation status. */
  description: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISupplier {
  id: string;
  name: string;
  phone: string | null;
  /**
   * A second line reaching the same person. Traders here routinely carry two
   * networks, and the number on file is the one that is off when it matters.
   */
  altPhone: string | null;

  community: string | null;
  sourceType: PurchaseSource;
  notes: string | null;
  photoUrl: string | null;
  email: string | null;
  address: string | null;
  idNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  momoNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBuyer {
  id: string;
  name: string;
  phone: string | null;
  /**
   * A second line reaching the same person. Traders here routinely carry two
   * networks, and the number on file is the one that is off when it matters.
   */
  altPhone: string | null;

  email: string | null;
  city: string | null;
  notes: string | null;
  photoUrl: string | null;
  address: string | null;
  businessName: string | null;
  registrationNumber: string | null;
  contactPersonName: string | null;
  contactPersonPhone: string | null;
  /** Reserved for the sales module - read-only until payment policies land. */
  paymentPolicyId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IExpenseCategory {
  id: string;
  name: string;
  /** What belongs under this heading, so two staff file a cost the same way. */
  description: string | null;
  /**
   * The accountant-style heading it prints under on the statements
   * ("Salaries and Wages"). Null prints under the category's own name.
   */
  statementHeading: string | null;
  /** Which statement section it belongs to. Every cost is grouped by this. */
  statementSection: StatementSection;
  /** How many expenses are filed under it (list responses only - mirrors
   * the backend ExpenseCategoryDTO's optional relation count). */
  expenseCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One-record and list envelopes, keyed the way the backend wraps them. */
export interface ICommodityResponse {
  message: string;
  data: { commodity: ICommodity };
}
export interface IWarehouseResponse {
  message: string;
  data: { warehouse: IWarehouse };
}
export interface ISupplierResponse {
  message: string;
  data: { supplier: ISupplier };
}
export interface IBuyerResponse {
  message: string;
  data: { buyer: IBuyer };
}
export interface IExpenseCategoryResponse {
  message: string;
  data: { expenseCategory: IExpenseCategory };
}

export interface IRegistryListResponse<T> {
  message: string;
  data: T[];
  meta: IPaginationMeta;
}

/** Shared list query params (server pagination + search + active filter). */
export interface IRegistryListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  from?: string;
  to?: string;
}

export interface ICommodityListQuery extends IRegistryListQuery {
  publishToWebsite?: boolean;
}

export interface ISupplierListQuery extends IRegistryListQuery {
  sourceType?: PurchaseSource;
}

/** Mirrors backend `createCommoditySchema` / `updateCommoditySchema`. */
export interface ICreateCommodityInput {
  name: string;
  variety?: string;
  qualityGrade?: string;
  description?: string;
  bagWeightKg?: number;
  sortOrder?: number;
}
export interface IUpdateCommodityInput {
  name?: string;
  variety?: string | null;
  qualityGrade?: string | null;
  description?: string | null;
  bagWeightKg?: number | null;
  sortOrder?: number;
  /** Clears the existing photo (the backend deletes the Cloudinary asset). */
  removePhoto?: boolean;
}

export interface ICreateWarehouseInput {
  name: string;
  description?: string;
  location?: string;
}
export interface IUpdateWarehouseInput {
  description?: string | null;
  name?: string;
  location?: string | null;
}

/** Mirrors backend `createSupplierSchema` / `updateSupplierSchema`. */
export interface ICreateSupplierInput {
  altPhone?: string;
  name: string;
  phone?: string;
  community?: string;
  sourceType?: PurchaseSource;
  notes?: string;
  email?: string;
  address?: string;
  idNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  momoNumber?: string;
}
export interface IUpdateSupplierInput {
  altPhone?: string | null;
  name?: string;
  phone?: string | null;
  community?: string | null;
  sourceType?: PurchaseSource;
  notes?: string | null;
  email?: string | null;
  address?: string | null;
  idNumber?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  momoNumber?: string | null;
  /** Clears the existing photo (the backend deletes the Cloudinary asset). */
  removePhoto?: boolean;
}

/** Mirrors backend `createBuyerSchema` / `updateBuyerSchema`. */
export interface ICreateBuyerInput {
  altPhone?: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  notes?: string;
  address?: string;
  businessName?: string;
  registrationNumber?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
}
export interface IUpdateBuyerInput {
  altPhone?: string | null;
  name?: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  notes?: string | null;
  address?: string | null;
  businessName?: string | null;
  registrationNumber?: string | null;
  contactPersonName?: string | null;
  contactPersonPhone?: string | null;
  /** Clears the existing photo (the backend deletes the Cloudinary asset). */
  removePhoto?: boolean;
}

export interface ICreateExpenseCategoryInput {
  name: string;
  description?: string;
  statementHeading?: string;
  statementSection?: StatementSection;
}
export interface IUpdateExpenseCategoryInput {
  name?: string;
  /** null clears it; undefined leaves it untouched. */
  description?: string | null;
  /** null clears it; undefined leaves it untouched. */
  statementHeading?: string | null;
  statementSection?: StatementSection;
}

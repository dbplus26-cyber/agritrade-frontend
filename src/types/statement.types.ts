// Financial-statement surface types - mirror the backend's statement DTOs
// (src/utils/mappers/statement.mapper.ts) and the composed
// FinancialStatementDocument the preview endpoint returns.
import type { PaymentAccountKind } from "./payment-account.types";

/**
 * Just enough of an account to name it beside a figure (the backend's
 * AccountRefDTO). Every register entry that moved money now says which
 * account it moved through: a row that shows an amount and stays silent about
 * where it came from is the bug this whole surface exists to close, one line
 * at a time.
 */
export interface IAccountRef {
  id: string;
  kind: PaymentAccountKind;
  label: string;
}

export interface IAssetClass {
  capitalAllowancePool: string;
  capitalAllowanceRatePct: number;
  createdAt: string;
  depreciationRatePct: number;
  id: string;
  isActive: boolean;
  name: string;
  sortOrder: number;
}

export interface IFixedAsset {
  acquiredAt: string;
  classId: string;
  className: string;
  costGhs: number;
  createdAt: string;
  /** Where the sale proceeds landed; null when the disposal raised nothing. */
  disposalAccount: IAccountRef | null;
  disposalProceedsGhs: null | number;
  disposedAt: null | string;
  id: string;
  name: string;
  /** Why buying it moved no company money; null when an account paid. */
  noCashReason: null | string;
  notes: null | string;
  /**
   * The account that paid for it. Also what says the acquisition POSTED: the
   * cost and the acquisition date are frozen once it has, so the edit dialog
   * reads this rather than offering a change the API will refuse.
   */
  paymentAccount: IAccountRef | null;
}

export interface IDrawing {
  amountGhs: number;
  createdAt: string;
  id: string;
  /** Why it moved no company money; null when an account paid it out. */
  noCashReason: null | string;
  notes: null | string;
  occurredAt: string;
  paymentAccount: IAccountRef | null;
  transactionNo: string;
}

export interface IOpeningBalance {
  asOfDate: string;
  cashGhs: number;
  inventoryGhs: number;
  notes: null | string;
  payablesGhs: number;
  receivablesGhs: number;
  updatedAt: string;
}

export interface IStatementPeriod {
  finalisedAt: null | string;
  id: string;
  status: "DRAFT" | "FINAL";
  year: number;
}

/** A current/prior figure pair off the composed document. */
export interface IStatementPair {
  current: number;
  prior: null | number;
}

export interface IStatementCheck {
  code: string;
  level: "error" | "warning";
  message: string;
}

/**
 * The slice of the composed FinancialStatementDocument the console reads for
 * its preview panel. The PDF renders the whole document server-side; the
 * screen only surfaces headlines and the pre-generation checks.
 */
export interface IStatementPreview {
  businessName: string;
  capitalAccount: { closing: IStatementPair };
  checks: IStatementCheck[];
  income: {
    costOfSales: IStatementPair;
    grossProfit: IStatementPair;
    landProfit: IStatementPair;
    netProfitAfterTax: IStatementPair;
    profitBeforeTax: IStatementPair;
    taxProvision: IStatementPair;
    turnover: IStatementPair;
  };
  position: {
    cash: IStatementPair;
    payables: IStatementPair;
    receivables: IStatementPair;
    totalAssets: IStatementPair;
    totalCapitalAndLiabilities: IStatementPair;
  };
  reference: string;
  status: "DRAFT" | "FINAL";
  year: number;
}

// ── Request bodies (mirror #validations/statement-validation.ts) ──

export interface IAssetClassBody {
  capitalAllowancePool: string;
  capitalAllowanceRatePct: number;
  depreciationRatePct: number;
  name: string;
  sortOrder?: number;
}

/**
 * Exactly one of these two travels with a drawing or an asset - never both,
 * never neither (CASH_SOURCE_AMBIGUOUS / CASH_SOURCE_REQUIRED). Optional
 * separately because it is the pair that is constrained, not either field.
 */
export interface ICashSourceBody {
  /** Why no company money moved, e.g. "Owned before the books started". */
  noCashReason?: string;
  /** The account the money moved through. Refused once retired. */
  paymentAccountId?: string;
}

export interface IFixedAssetBody extends ICashSourceBody {
  acquiredAt: string;
  classId: string;
  costGhs: number;
  name: string;
  notes?: string;
}

/** The descriptive half of an asset: what a PATCH is allowed to carry. */
export interface IFixedAssetEditBody {
  acquiredAt?: string;
  classId?: string;
  costGhs?: number;
  name?: string;
  notes?: null | string;
}

export interface IDisposeAssetBody {
  /** Where the proceeds landed. Required by the API once there are any. */
  disposalAccountId?: string;
  disposalProceedsGhs: number;
  disposedAt: string;
}

export interface IDrawingBody extends ICashSourceBody {
  amountGhs: number;
  notes?: string;
  occurredAt: string;
}

export interface IOpeningBalanceBody {
  asOfDate: string;
  cashGhs: number;
  inventoryGhs: number;
  notes?: null | string;
  payablesGhs: number;
  receivablesGhs: number;
}

// Financial-statement surface types - mirror the backend's statement DTOs
// (src/utils/mappers/statement.mapper.ts) and the composed
// FinancialStatementDocument the preview endpoint returns.

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
  disposalProceedsGhs: null | number;
  disposedAt: null | string;
  id: string;
  name: string;
  notes: null | string;
}

export interface IDrawing {
  amountGhs: number;
  createdAt: string;
  id: string;
  notes: null | string;
  occurredAt: string;
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

export interface IFixedAssetBody {
  acquiredAt: string;
  classId: string;
  costGhs: number;
  name: string;
  notes?: string;
}

export interface IDisposeAssetBody {
  disposalProceedsGhs: number;
  disposedAt: string;
}

export interface IDrawingBody {
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

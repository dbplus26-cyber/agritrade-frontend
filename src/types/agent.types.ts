import type { IPaginationMeta } from "./api";

/**
 * Agents, float ledgers and reconciliations, mirroring the backend
 * `agent-float.mapper.ts` and the `/admin/agents` + `/agent` surfaces.
 */

/** Mirrors the backend `FloatTxType` enum (amounts are SIGNED in the ledger). */
export enum FloatTxType {
  TOP_UP = "TOP_UP",
  PURCHASE = "PURCHASE",
  FIELD_EXPENSE = "FIELD_EXPENSE",
  ADJUSTMENT = "ADJUSTMENT",
}

/** Mirrors the backend `PaymentMethod` enum. Every payment is recorded by hand. */
export enum PaymentMethod {
  CASH = "CASH",
  MOMO = "MOMO",
  BANK = "BANK",
}

/** One float ledger line (`toFloatTransactionDTO`); amountGhs is signed. */
export interface IFloatTransaction {
  id: string;
  /** Human-readable document number, e.g. "SAL-2026-00042". */
  transactionNo: string;
  type: FloatTxType;
  /** Null when the API redacted it (financial visibility). */
  amountGhs: number | null;
  method: PaymentMethod | null;
  reason: string | null;
  purchaseId: string | null;
  expenseId: string | null;
  idempotencyKey: string | null;
  occurredAt: string;
}

/** An agent row in the admin register (`AgentSummaryDTO`). */
export interface IAgentSummary {
  userId: string;
  /** Null until the agent's float is first opened (top-up or purchase). */
  profileId: string | null;
  profilePicture: string | null;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  region: string | null;
  isActive: boolean;
  /** Null when the API redacted it (financial visibility). */
  balanceGhs: number | null;
}

/** Mirrors `toReconciliationDTO`: the immutable sit-down count snapshot. */
export interface IReconciliation {
  id: string;
  // Every figure below is nullable for the same reason: the API redacts money
  // for staff without financial visibility.
  openingGhs: number | null;
  topUpsGhs: number | null;
  purchasesGhs: number | null;
  expensesGhs: number | null;
  expectedGhs: number | null;
  countedGhs: number | null;
  varianceGhs: number | null;
  adjustmentTxId: string | null;
  notes: string | null;
  performedAt: string;
}

/** Mirrors the backend `ReconciliationPreview` (adjustments stay signed). */
export interface IReconciliationPreview {
  agentProfileId: string;
  openingGhs: number;
  topUpsGhs: number;
  purchasesGhs: number;
  expensesGhs: number;
  adjustmentsGhs: number;
  expectedGhs: number;
  /** The previous reconciliation's instant; null for the first count. */
  since: string | null;
}

export interface IAgentDetail extends IAgentSummary {
  lastReconciliation: IReconciliation | null;
}

export interface IAgentListResponse {
  message: string;
  data: IAgentSummary[];
  meta: IPaginationMeta;
}

export interface IAgentDetailResponse {
  message: string;
  data: { agent: IAgentDetail };
}

/** Paginated ledger with the live balance riding in `summary`. */
export interface IFloatLedgerResponse {
  message: string;
  data: IFloatTransaction[];
  meta: IPaginationMeta;
  summary: {
    /** The agent's LIVE float, regardless of any window. */
    balanceGhs: number | null;
    /** Everything through `to` - the window's closing figure. */
    closingBalanceGhs: number | null;
    /**
     * Everything strictly before `from`. A statement that starts mid-history
     * and runs its total from zero is a lie, so this is what it starts from.
     */
    openingBalanceGhs: number | null;
  };
}

export interface IFloatTransactionResponse {
  message: string;
  data: { transaction: IFloatTransaction };
}

export interface IReconciliationListResponse {
  message: string;
  data: IReconciliation[];
  meta: IPaginationMeta;
}

export interface IReconciliationPreviewResponse {
  message: string;
  data: { preview: IReconciliationPreview };
}

export interface IReconciliationResponse {
  message: string;
  data: { reconciliation: IReconciliation };
}

export interface IAgentListQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

/** Ledger paging (dates travel as YYYY-MM-DD). */
export interface IFloatLedgerQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}

/** Mirrors backend `topUpSchema`. */
export interface ITopUpInput {
  amountGhs: number;
  method: PaymentMethod.CASH | PaymentMethod.MOMO | PaymentMethod.BANK;
  reason?: string;
}

export interface ICreateReconciliationInput {
  countedGhs: number;
  notes?: string;
}

/** Mirrors backend `fieldExpenseSchema` (agent self-recorded). */
export interface IAgentExpenseInput {
  categoryId: string;
  amountGhs: number;
  description?: string;
  incurredAt: string;
}

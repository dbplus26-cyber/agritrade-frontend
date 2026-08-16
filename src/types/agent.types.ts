import type { IPaginationMeta } from "./api";
import type { UserRole } from "./user.types";

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
  /** A Hubtel send drawn on this allocation: the hold, or its refund. */
  DISBURSEMENT = "DISBURSEMENT",
}

/** Mirrors the backend `PaymentMethod` enum. Every payment is recorded by hand. */
export enum PaymentMethod {
  CASH = "CASH",
  MOMO = "MOMO",
  BANK = "BANK",
}

/** One float ledger line (`toFloatTransactionDTO`); amountGhs is signed. */
/**
 * One line of what somebody is holding for the business.
 *
 * Mirrors the backend `toHeldMovementDTO`. It carries WHICH of their accounts
 * moved, which the float row it replaces could not: a single balance covering
 * cash in a pocket and money in a wallet is exactly what made an agent's
 * position unreadable, and a statement that does not say which pot moved
 * reproduces the problem one row at a time.
 */
export interface IFloatTransaction {
  account: { id: string; kind: string; label: string };
  /** Null when the API redacted it (financial visibility). */
  amountGhs: number | null;
  id: string;
  occurredAt: string;
  reason: string | null;
  /** Human-readable document number, e.g. "PUR-2026-00042". */
  transactionNo: string;
  /** The cash-book movement type: RECEIPT, PAYMENT, TRANSFER_IN, … */
  type: string;
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

/**
 * Somebody the owner can fund - staff OR field agent. Mirrors
 * `toFloatHolderDTO`.
 *
 * `accountId` is null until an allocation has actually been opened for them,
 * and that state is shown rather than hidden: a staff member with no float
 * yet is exactly who the owner is looking for when they come to fund one.
 */
/**
 * Permission to spend the COMPANY's money, as the console reads it.
 *
 * Never folded into the balance beside it. What somebody HOLDS is money in
 * their own accounts and falls when they spend it; an allowance is a licence
 * to draw on an account belonging to the business, and what falls when it is
 * used is the company's. The float was one number for both, which is why an
 * agent handed GHS 5,000 cash who then sent GHS 3,000 by mobile money had his
 * own cash shown as 2,000 while the 5,000 was still in his hand.
 */
export interface IHolderAuthority {
  /** Null means UNCAPPED. A cap of zero is refused: that is a suspension. */
  capGhs: number | null;
  /** Null where nobody has chosen one: sends fall back to the payout wallet. */
  drawsOnAccount: null | { id: string; label: string };
  isActive: boolean;
  /** Null when uncapped. Otherwise the cap less the sends already made. */
  remainingGhs: number | null;
  usedGhs: number | null;
}

export interface IFloatHolder {
  userId: string;
  /** Null where this person has no permission to send at all. */
  authority: IHolderAuthority | null;
  accountId: string | null;
  accountActive: boolean;
  agentProfileId: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePicture: string | null;
  region: string | null;
  isActive: boolean;
  /** Null when the API redacted it (financial visibility). */
  balanceGhs: number | null;
}

export interface IFloatHolderListQuery {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  withAccountOnly?: boolean;
  search?: string;
}

export interface IFloatHolderListResponse {
  success: boolean;
  message: string;
  data: IFloatHolder[];
  meta: IPaginationMeta;
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

/**
 * One place a person actually keeps the business's money.
 *
 * There is a row per pot because cash in a pocket, money in their own wallet
 * and money in their own bank are three different things, and the single
 * figure that used to cover all three is what made an agent's position
 * unreadable: cash he was still holding read as spent because a mobile-money
 * send had come off the same total.
 */
export interface IHeldPot {
  balanceGhs: number;
  id: string;
  kind: "BANK" | "CASH" | "MOMO" | "OTHER";
  label: string;
}

/**
 * Permission to spend the COMPANY's money, which holds nothing itself.
 *
 * Deliberately never added to a balance and never shown in the same breath.
 * Money somebody holds falls when they spend it; an allowance is a licence to
 * draw on an account belonging to the business, and what falls when it is used
 * is the company's account, not theirs.
 */
export interface ISpendingStanding {
  /** Null means UNCAPPED, which is not the same as a cap of zero. */
  capGhs: number | null;
  remainingGhs: number | null;
  usedGhs: number;
}

export interface IMySpendingResponse {
  message: string;
  data: { spending: ISpendingStanding };
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
    /**
     * Whether the allocation may still be spent from. Only the /admin/floats
     * surface sends it; the agent's own view has no use for it.
     */
    accountActive?: boolean;
    /**
     * One row per pot. `balanceGhs` above is their sum and stays, because "how
     * much of the company's money am I holding" is a real question - it is
     * just no longer the only answer available.
     */
    pots?: IHeldPot[];
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

/**
 * Mirrors backend `topUpSchema`.
 *
 * `fromAccountId` is REQUIRED, and that is the whole point of the shape. A
 * top-up used to say only how much and by what method, so money appeared in an
 * agent's hands and left no company account - the business's own position never
 * fell by what it had just given away. Naming the source makes it a transfer,
 * which is what it always was.
 */
export interface ITopUpInput {
  amountGhs: number;
  /** The company account the money actually left. */
  fromAccountId: string;
  occurredAt?: string;
  reason?: string;
  /** One of the holder's own accounts; omit and `toKind` opens the right one. */
  toAccountId?: string;
  /** Where it landed: cash in hand, their wallet, their bank. */
  toKind?: "BANK" | "CASH" | "MOMO";
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
  /** A purchase in this agent's name that the cost was incurred for. */
  purchaseId?: string;
  /**
   * Whether the cost rides on the goods (true) or lands in the current
   * period (false). Only meaningful with a purchaseId; the server defaults
   * it to true when one is given.
   */
  capitalise?: boolean;
}

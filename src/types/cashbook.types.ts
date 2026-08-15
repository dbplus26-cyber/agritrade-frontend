// src/types/cashbook.types.ts
//
// The cash book (`/admin/accounts`): where the business's money actually is,
// and the entries an owner makes to it directly rather than through a sale, a
// cost or a land deal.
//
// Distinct from `payment-account.types.ts`, which is the REGISTER - the
// accounts a customer is told to pay into. This covers every account including
// the office till, the Hubtel wallets and money a named person is holding.
import type { IPaginationMeta } from "./api";
import type { IPaymentAccount, PaymentAccountKind } from "./payment-account.types";

/**
 * The entry types an owner posts by hand. Mirrors ACCOUNT_ENTRY_TYPES in the
 * backend's cashbook service; the direction each one runs in is the server's
 * decision, not the form's.
 */
export type AccountEntryType =
  | "CAPITAL"
  | "CHARGE"
  | "CORRECTION"
  | "DEPOSIT"
  | "OPENING"
  | "WITHDRAWAL";

/** The stable handles the server resolves by name. Null for a human's account. */
export type SystemAccountKey =
  | "COMPANY_TILL"
  | "HUBTEL_COLLECTION"
  | "HUBTEL_DISBURSEMENT"
  | "SUSPENSE";

/** One account and what it holds. */
export interface IAccountBalance {
  balanceGhs: number | null;
  /** Set when this is money a named person is holding for the business. */
  holderUserId: string | null;
  id: string;
  isActive: boolean;
  kind: PaymentAccountKind;
  label: string;
  systemKey: SystemAccountKey | null;
}

export interface ICashBookResponse {
  message: string;
  data: {
    accounts: IAccountBalance[];
    /**
     * Every account except suspense. Money parked there has no known home, and
     * counting it as cash would be exactly the false precision this book
     * exists to remove - so it is reported separately.
     */
    cashGhs: number | null;
    suspenseGhs: number | null;
  };
}

/** One line of an account's ledger, with the balance after it. */
export interface ILedgerRow {
  amountGhs: number | null;
  balanceGhs: number | null;
  counterparty: string;
  direction: "IN" | "OUT";
  id: string;
  isReversal: boolean;
  /** A payment's method, or - for an account-native entry - its type. */
  method: string;
  paidAt: string;
  parentId: string;
  parentNo: string;
  reference: string | null;
  source: string;
  transactionNo: string;
}

export interface IAccountLedgerResponse {
  message: string;
  data: ILedgerRow[];
  meta: IPaginationMeta;
  summary: {
    account: IPaymentAccount;
    balanceGhs: number | null;
  };
}

export interface IAccountLedgerQuery {
  limit?: number;
  page?: number;
}

export interface IPostAccountEntryInput {
  /** Positive for every type except OPENING and CORRECTION, which are signed. */
  amountGhs: number;
  occurredAt: string;
  reason: string;
  type: AccountEntryType;
}

export interface IAccountEntryResponse {
  message: string;
  data: {
    entry: {
      accountId: string;
      amountGhs: number;
      id: string;
      occurredAt: string;
      reason: string | null;
      transactionNo: string;
      type: AccountEntryType;
    };
  };
}

export interface ITransferInput {
  amountGhs: number;
  fromAccountId: string;
  occurredAt: string;
  reason?: string;
  toAccountId: string;
}

export interface IAccountTransferResponse {
  message: string;
  data: {
    transfer: {
      amountGhs: number;
      fromAccountId: string;
      id: string;
      occurredAt: string;
      reason: string | null;
      toAccountId: string;
      transactionNo: string;
    };
  };
}

export interface IReconcileInput {
  asOf: string;
  countedBalanceGhs: number;
  notes?: string;
  /** Off by default: most of a bank variance is timing, not error. */
  postCorrection?: boolean;
}

export interface IAccountReconciliation {
  accountId: string;
  asOf: string;
  bookBalanceGhs: number;
  /** Set when the owner decided the variance was an error and closed it. */
  correctionId: string | null;
  countedBalanceGhs: number;
  id: string;
  notes: string | null;
  performedAt: string;
  /** counted − book. Positive means more money than the books knew about. */
  varianceGhs: number;
}

export interface IReconciliationResponse {
  message: string;
  data: { reconciliation: IAccountReconciliation };
}

export interface IReconciliationListResponse {
  message: string;
  data: { reconciliations: IAccountReconciliation[] };
}

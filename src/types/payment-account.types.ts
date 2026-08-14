// src/types/payment-account.types.ts
//
// Where customers are told to send money (`/admin/payment-accounts`). Manual
// bank transfer is the primary rail for large payments, so these are records
// the owner maintains, not constants in an invoice template.
import type { IPaginationMeta } from "./api";
import type { IRegistryListQuery } from "./registry.types";

export type PaymentAccountKind = "BANK" | "CASH" | "MOMO" | "OTHER";

/**
 * Mirrors the backend payment-account DTO (envelope key `account`).
 *
 * `accountName` and `accountNumber` are nullable because not every account is
 * somewhere money is SENT to. The cash book treats every place money can sit as
 * an account - the office till, an agent's cash in hand - and a cash box has no
 * number to quote. This register endpoint only ever returns the accounts a
 * human added as a payment destination, so in practice both are set here; the
 * type is honest about the model rather than about one endpoint's filter.
 */
export interface IPaymentAccount {
  id: string;
  label: string;
  kind: PaymentAccountKind;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branch: string | null;
  sortCode: string | null;
  swiftCode: string | null;
  provider: string | null;
  instructions: string | null;
  isActive: boolean;
  showOnInvoice: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * The narrower shape a document prints. Deliberately without the internal
 * label or lifecycle flags: a customer needs where to send money and under
 * what name, nothing else.
 */
export interface IPayableAccount {
  kind: PaymentAccountKind;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  branch: string | null;
  sortCode: string | null;
  swiftCode: string | null;
  provider: string | null;
  instructions: string | null;
}

export interface ICreatePaymentAccountInput {
  label: string;
  kind: PaymentAccountKind;
  accountName: string;
  accountNumber: string;
  bankName?: string;
  branch?: string;
  sortCode?: string;
  swiftCode?: string;
  provider?: string;
  instructions?: string;
  isActive?: boolean;
  showOnInvoice?: boolean;
  sortOrder?: number;
}

export interface IUpdatePaymentAccountInput {
  label?: string;
  kind?: PaymentAccountKind;
  accountName?: string;
  accountNumber?: string;
  bankName?: string | null;
  branch?: string | null;
  sortCode?: string | null;
  swiftCode?: string | null;
  provider?: string | null;
  instructions?: string | null;
  isActive?: boolean;
  showOnInvoice?: boolean;
  sortOrder?: number;
}

export interface IPaymentAccountListQuery extends IRegistryListQuery {
  kind?: PaymentAccountKind;
  /** Only the accounts customers are shown - what an invoice prints. */
  onInvoice?: boolean;
}

export interface IPaymentAccountResponse {
  message: string;
  data: { account: IPaymentAccount };
}

export interface IPayableAccountsResponse {
  message: string;
  data: { accounts: IPayableAccount[] };
}

// ── Account movement history ──────────────────────────────────────

/** Which money ledger a movement row comes from. */
export type AccountMovementSource =
  | "DRIVER_PAYMENT"
  | "EXPENSE_PAYMENT"
  | "LAND_ACQUISITION_PAYMENT"
  | "LAND_SALE_PAYMENT"
  | "SALE_PAYMENT";

/**
 * One payment row (from any of the five money ledgers) that named this
 * account, mirroring the backend `AccountMovementDTO`
 * (utils/mappers/payment-account.mapper.ts). Amounts keep their stored sign
 * (a reversal is negative) and are null when money is hidden - the row
 * itself stays so staff can still answer "did the transfer arrive?".
 */
export interface IAccountMovement {
  id: string;
  /** Receipt/voucher number of the payment row itself. */
  transactionNo: string;
  amountGhs: number | null;
  method: "BANK" | "CASH" | "MOMO";
  reference: string | null;
  paidAt: string;
  isReversal: boolean;
  source: AccountMovementSource;
  direction: "IN" | "OUT";
  /** Document number of the sale / land sale / acquisition it belongs to. */
  parentNo: string;
  parentId: string;
  /** Buyer (money in) or land seller (money out). */
  counterparty: string;
}

export interface IAccountHistoryQuery {
  page?: number;
  limit?: number;
}

/** GET admin/payment-accounts/:accountId/payments */
export interface IPaymentAccountHistoryResponse {
  message: string;
  data: IAccountMovement[];
  meta: IPaginationMeta;
  summary: {
    account: IPaymentAccount;
    inGhs: number | null;
    netGhs: number | null;
    outGhs: number | null;
  };
}

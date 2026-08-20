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

/**
 * One row of the "where did this money actually end up" picker
 * (`GET /admin/payment-accounts/settlement`), mirroring the backend
 * `SettlementAccountDTO`.
 *
 * A different question from both lists above: the register says where
 * customers send money, the payable list says what prints on an invoice, and
 * neither can answer this one, because the honest answer is sometimes a
 * PERSON. An agent who collected GHS 3,000 at a roadside is holding it, and
 * booking that to the office till says the money is in a box it is not in - so
 * held accounts are offered here, named after whoever is holding them.
 *
 * Carries no account number and no balance BY CONTRACT: the picker is offered
 * to anyone who may record a payment, and balances are money-visibility gated,
 * so a figure here would leak what the ledger endpoints deliberately null.
 * Nothing in the UI may build a hint out of either.
 */
export interface ISettlementAccount {
  /** Set when this account is money a named person is holding. */
  holder: null | { id: string; name: string };
  id: string;
  kind: PaymentAccountKind;
  /** Already reads as the person for a held account: "Kwame Mensah - cash". */
  label: string;
  /**
   * The stable handle for an account the system keeps rather than a person
   * created - only COMPANY_TILL reaches this list. Null for everything else.
   *
   * Lets a screen resolve the till BY NAME instead of hoping the reader picks
   * the right row: handing an agent notes always leaves the office box, and a
   * UI that guesses which of several cash-looking accounts that is will
   * eventually guess wrong.
   */
  systemKey: null | string;
}

export interface ISettlementAccountsResponse {
  message: string;
  data: { accounts: ISettlementAccount[] };
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

/**
 * What caused a movement row: the document kind where one exists, and the
 * movement's own type where it does not.
 *
 * The server builds this in `services/cashbook/movement-rows.ts`, and its final
 * branch is `ELSE m."type"::text` - an account-native entry (a deposit, a bank
 * charge, an opening position) belongs to no document, so it reports its
 * AccountMovementType instead. That branch is why the string is left open:
 * anything rendering this MUST tolerate a value not listed here, or a new
 * ledger on the server takes the screen down. The known values are named so
 * they still autocomplete.
 */
export type AccountMovementSource =
  | "CAPITAL"
  | "CHARGE"
  | "CORRECTION"
  | "DEPOSIT"
  | "DISBURSEMENT"
  | "DRIVER_PAYMENT"
  | "EXPENSE_PAYMENT"
  | "FIXED_ASSET"
  | "INPUT_GRANT"
  | "LAND_ACQUISITION_PAYMENT"
  | "LAND_SALE_PAYMENT"
  | "OPENING"
  | "PRODUCE_REPAYMENT"
  | "PROPRIETOR_DRAWING"
  | "PURCHASE_PAYMENT"
  | "SALE_PAYMENT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "WITHDRAWAL"
  | (string & {});

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

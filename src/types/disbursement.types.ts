// src/types/disbursement.types.ts
//
// Money OUT through Hubtel, mirroring the backend `disbursement.mapper.ts`
// and `treasury.mapper.ts`.
//
// The one idea worth carrying over from the server: a send has TWO limits and
// both must pass. The sender's float says how much of the company's money
// that person may move; the company's Hubtel disbursement account is the
// actual cash every send is drawn on. A healthy float over an empty company
// account still cannot send, and the UI has to be able to say which of the
// two refused - hence the distinct error codes below.
import type { IPaginationMeta } from "./api";
import type { UserRole } from "./user.types";

export type DisbursementRail = "BANK" | "MOMO";

export type DisbursementStatus =
  | "FAILED"
  /** Recorded, not yet acknowledged by Hubtel. */
  | "PENDING"
  /** Hubtel took it; the callback or the status sweep settles it. */
  | "SUBMITTED"
  | "SUCCESS";

/** The mobile-money networks the Direct Send rail accepts. */
export type MomoChannel = "mtn-gh" | "tigo-gh" | "vodafone-gh";

export const MOMO_CHANNEL_LABELS: Record<MomoChannel, string> = {
  "mtn-gh": "MTN",
  "tigo-gh": "AirtelTigo",
  "vodafone-gh": "Telecel (Vodafone)",
};

/** Whose allocation paid for a send; null when the owner sent it. */
export interface IDisbursementHolder {
  accountId: string;
  name: string;
  role: UserRole;
}

/** Mirrors `DisbursementDTO` (envelope key `disbursement`). */
export interface IDisbursement {
  id: string;
  /** Human-readable document number, e.g. "DSB-2026-00042". */
  transactionNo: string;
  /** What Hubtel dedupes on - our own row id. */
  clientReference: string;
  rail: DisbursementRail;
  status: DisbursementStatus;
  channel: string | null;
  bankCode: string | null;
  bankName: string | null;
  recipientName: string;
  recipientMsisdn: string | null;
  bankAccountNumber: string | null;
  amountGhs: number;
  chargesGhs: number | null;
  amountDebitedGhs: number | null;
  description: string;
  hubtelTransactionId: string | null;
  externalTransactionId: string | null;
  responseCode: string | null;
  failureReason: string | null;
  /** Raised when Hubtel keeps giving no final answer - a human must decide. */
  needsAttention: boolean;
  holder: IDisbursementHolder | null;
  requestedByName: string | null;
  submittedAt: string | null;
  settledAt: string | null;
  createdAt: string;
}

export interface ICreateDisbursementInput {
  rail: DisbursementRail;
  amountGhs: number;
  recipientName: string;
  description: string;
  /** MOMO only. */
  channel?: MomoChannel;
  recipientMsisdn?: string;
  /** BANK only. */
  bankCode?: string;
  bankAccountNumber?: string;
}

export interface IDisbursementListQuery {
  page?: number;
  limit?: number;
  status?: DisbursementStatus;
  rail?: DisbursementRail;
  needsAttention?: boolean;
  search?: string;
  from?: string;
  to?: string;
}

export interface IResolveDisbursementInput {
  outcome: "FAILED" | "SUCCESS";
  reason: string;
}

export interface ISupportedBank {
  code: string;
  name: string;
}

export interface IDisbursementResponse {
  success: boolean;
  message: string;
  data: { disbursement: IDisbursement };
}

export interface IDisbursementListResponse {
  success: boolean;
  message: string;
  data: IDisbursement[];
  meta: IPaginationMeta;
}

export interface ISupportedBanksResponse {
  success: boolean;
  message: string;
  data: { banks: ISupportedBank[] };
}

/** Hubtel's answer for who a mobile-money number belongs to. */
export interface IRecipientNameLookup {
  /** Name as Hubtel has it (usually ALL CAPS); null when nothing matched. */
  name: string | null;
  /** True when the number holds a wallet on the queried network. */
  registered: boolean;
  /** Which register answered: the wallet, or the SIM registration. */
  source: "momo" | "sim" | null;
}

export interface IRecipientNameResponse {
  success: boolean;
  message: string;
  /** `configured: false` means the environment cannot look names up at all -
   * the hint simply stays silent. */
  data: { configured: boolean; lookup: IRecipientNameLookup | null };
}

// ── Treasury: the company's own Hubtel position ──────────────────────

export type BalanceTransferStatus =
  | "FAILED"
  | "PENDING"
  | "SUBMITTED"
  | "SUCCESS";

/**
 * One Hubtel account. `amountGhs` is null when the balance could NOT be read
 * - deliberately not zero, because "we could not ask" and "the account is
 * empty" are different facts and the screen must never conflate them.
 */
export interface IAccountBalance {
  accountNumber: string | null;
  amountGhs: number | null;
  fetchedAt: string | null;
}

export interface ITreasuryOverview {
  collection: IAccountBalance;
  disbursement: IAccountBalance;
  /** False when the server has no Hubtel credentials at all. */
  configured: boolean;
}

/** Money moved from the collection account into the disbursement account. */
export interface IBalanceTransfer {
  id: string;
  transactionNo: string;
  clientReference: string;
  amountGhs: number;
  description: string;
  status: BalanceTransferStatus;
  responseCode: string | null;
  failureReason: string | null;
  needsAttention: boolean;
  requestedByName: string | null;
  submittedAt: string | null;
  settledAt: string | null;
  createdAt: string;
}

export interface ICreateTransferInput {
  amountGhs: number;
  description: string;
}

export interface ITransferListQuery {
  page?: number;
  limit?: number;
  status?: BalanceTransferStatus;
  from?: string;
  to?: string;
}

export interface ITreasuryResponse {
  success: boolean;
  message: string;
  data: { treasury: ITreasuryOverview };
}

export interface IBalanceTransferResponse {
  success: boolean;
  message: string;
  data: { transfer: IBalanceTransfer };
}

export interface IBalanceTransferListResponse {
  success: boolean;
  message: string;
  data: IBalanceTransfer[];
  meta: IPaginationMeta;
}

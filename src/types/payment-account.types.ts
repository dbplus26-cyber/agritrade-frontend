// src/types/payment-account.types.ts
//
// Where customers are told to send money (`/admin/payment-accounts`). Manual
// bank transfer is the primary rail for large payments, so these are records
// the owner maintains, not constants in an invoice template.
import type { IRegistryListQuery } from "./registry.types";

export type PaymentAccountKind = "BANK" | "CASH" | "MOMO" | "OTHER";

/** Mirrors the backend payment-account DTO (envelope key `account`). */
export interface IPaymentAccount {
  id: string;
  label: string;
  kind: PaymentAccountKind;
  accountName: string;
  accountNumber: string;
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
  accountName: string;
  accountNumber: string;
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

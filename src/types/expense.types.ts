/**
 * Operating costs. Mirrors the backend `/admin/expenses` contract
 * (utils/mappers/expense.mapper.ts). Money fields are `null` when the caller
 * has no financial visibility - the API redacts, the UI just renders what it
 * is given.
 */
import type { SalePaymentMethod } from "./admin-sale.types";
import type { IExpenseSettlement } from "./driver-settlement.types";

export interface IExpense {
  amountGhs: null | number;
  category: { id: string; name: string };
  createdAt: string;
  description: null | string;
  id: string;
  incurredAt: string;
  /** Present when the cost belongs to a specific trip. */
  shipment: null | {
    destination: string;
    id: string;
    transactionNo: string;
    truckReg: string;
  };
  /** Human-readable voucher number, e.g. "EXP-2026-00156". */
  transactionNo: string;
  /**
   * Set when this voucher was voided. Deliberately NOT money, so it survives
   * redaction: a voided cost has to read as voided for every user.
   */
  voidedAt: null | string;
  voidReason: null | string;
}

export interface IExpenseResponse {
  data: { expense: IExpense };
  message: string;
}

export interface IExpenseListResponse {
  data: IExpense[];
  message: string;
  meta: { limit: number; page: number; total: number; totalPages: number };
  /** Total across the WHOLE filtered window, not just this page. */
  summary?: { totalGhs: null | number };
}

/** "standalone" = operating costs; "shipment" = per-trip costs. */
export type ExpenseScope = "shipment" | "standalone";

export interface IExpenseListQuery {
  categoryId?: string;
  from?: string;
  limit?: number;
  page?: number;
  scope?: ExpenseScope;
  search?: string;
  shipmentId?: string;
  to?: string;
}

export interface ICreateExpenseInput {
  amountGhs: number;
  categoryId: string;
  description?: string;
  incurredAt: string;
  /** Omit to record the cost unpaid - the payee is simply owed. */
  payment?: IExpensePaymentOnCreate;
  shipmentId?: string;
}

/**
 * Settling the cost in the same submission that records it.
 *
 * `amountGhs` is omitted by the console on purpose: the server defaults it to
 * the whole cost, and asking for the same figure twice is how a part payment
 * gets recorded by accident. BANK and MOMO must carry both a reference and the
 * account the money moved on (REFERENCE_REQUIRED, ACCOUNT_REQUIRED); cash
 * needs neither and falls to the office till.
 *
 * No disbursementId, deliberately, and the server strips it: booking a Hubtel
 * send is a decision about a cost that ALREADY EXISTS, and the send has to have
 * landed before anything can be booked against it. Match it from the cost's
 * own settlement card instead.
 */
export interface IExpensePaymentOnCreate {
  amountGhs?: number;
  method: SalePaymentMethod;
  paidAt?: string;
  paymentAccountId?: string;
  reference?: string;
}

/**
 * What recording a cost answers with: the voucher, and how settled it now is.
 *
 * The settlement travels with the create because the caller has just asked for
 * both halves - making the console fetch the cost again to learn whether its
 * own payment landed is the round trip the combined endpoint exists to remove.
 */
export interface ICreateExpenseResponse {
  data: { expense: IExpense; settlement: IExpenseSettlement };
  message: string;
}

export interface IUpdateExpenseInput {
  amountGhs?: number;
  categoryId?: string;
  description?: null | string;
  incurredAt?: string;
}

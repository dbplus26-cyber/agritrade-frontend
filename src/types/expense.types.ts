/**
 * Operating costs. Mirrors the backend `/admin/expenses` contract
 * (utils/mappers/expense.mapper.ts). Money fields are `null` when the caller
 * has no financial visibility - the API redacts, the UI just renders what it
 * is given.
 */

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
  shipmentId?: string;
}

export interface IUpdateExpenseInput {
  amountGhs?: number;
  categoryId?: string;
  description?: null | string;
  incurredAt?: string;
}

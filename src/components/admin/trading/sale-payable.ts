// src/components/admin/trading/sale-payable.ts
//
// The one answer to "how much does this buyer owe us", on the console side.
// The frontend half of the backend's `src/services/sale/payable-total.ts`.
//
// A sale carries two totals. `agreedTotalGhs` is what both sides shook hands
// on when the sale was struck. `settledTotalGhs` is what the buyer will
// actually pay, agreed when the truck arrived and the load was re-weighed -
// grain loses moisture in the heat, some spills, and occasionally the origin
// scale was simply generous.
//
// The register's balance column, the sale's balance row, the invoice's
// "receipt or invoice" decision, and the payment dialog's readout and its
// full-balance quick fill all answer the same question. They agreed only
// because there was a single field for them to read. With a second field,
// "they all read the same one" stops being a guarantee and becomes something
// somebody has to remember - so it is stated once, here.

/**
 * The two totals a payable read needs. Both are `number | null` because every
 * money field on the wire is redacted to null for staff without financial
 * visibility (design doc 8.3).
 *
 * `settledTotalGhs` is optional so a payload from an API build that does not
 * carry the column yet still reads as "not weighed", never as "settled at
 * nothing".
 */
export interface PayableSale {
  agreedTotalGhs: null | number;
  /** What the buyer will actually pay. Null until the load was re-weighed. */
  settledTotalGhs?: null | number;
}

/** A payable sale plus what has actually been received against it. */
export interface PaidSale extends PayableSale {
  paidGhs: null | number;
}

/** Pesewas. Balances are compared at the scale the API stores them. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * What this sale is actually payable at: the settled figure once the goods
 * have been received and re-weighed, the agreed one until then.
 *
 * `??` and not `||`: a settled total of ZERO is a real answer - a delivery
 * refused outright is settled at nothing - and `||` would quietly fall back to
 * the agreed figure and go on chasing a buyer for a load they sent back.
 */
export const salePayableTotal = (sale: PayableSale): null | number =>
  // The trailing `?? null` is not decoration: an absent agreed total would
  // otherwise return undefined, which passes the `=== null` guards below and
  // turns every balance downstream into NaN.
  sale.settledTotalGhs ?? sale.agreedTotalGhs ?? null;

/**
 * Whether the load has been re-weighed and a figure agreed.
 *
 * A `typeof` check rather than `!== null`: an API build that does not send the
 * column yet leaves it undefined, and that is "not weighed", not "settled".
 * This is what decides whether a screen shows two totals or one - where there
 * is no settled figure, the agreed one stands ALONE, never beside an empty
 * cell or a zero.
 */
export const hasSettledTotal = (sale: PayableSale): boolean =>
  typeof sale.settledTotalGhs === "number";

/**
 * Settled less agreed: what the re-weigh cost (negative) or found (positive).
 * Null while there is nothing to compare, so a screen shows the agreement
 * alone rather than a difference of zero that was never measured.
 */
export const saleSettlementDeltaGhs = (sale: PayableSale): null | number => {
  const settled = sale.settledTotalGhs;
  if (settled === null || settled === undefined) return null;
  if (sale.agreedTotalGhs === null) return null;
  return round2(settled - sale.agreedTotalGhs);
};

/**
 * What the buyer still owes: payable less paid, floored at zero.
 *
 * Floored because a sale settled below what was already paid is an overpayment
 * awaiting a reversal, and a negative balance on screen states the opposite of
 * what happened - that the business owes the buyer nothing further, when in
 * fact it is holding their money.
 *
 * Null when either side was redacted: "not for you" must never render as a
 * figure somebody could act on.
 */
export const saleBalanceGhs = (sale: PaidSale): null | number => {
  const payable = salePayableTotal(sale);
  if (payable === null || sale.paidGhs === null) return null;
  return Math.max(round2(payable - sale.paidGhs), 0);
};

/**
 * Whether nothing is left to collect. False on a redacted sale: an unknown
 * balance is unknown, and reading it as settled would tell a user without
 * financial visibility that a debtor is square.
 */
export const saleIsPaidInFull = (sale: PaidSale): boolean =>
  saleBalanceGhs(sale) === 0;

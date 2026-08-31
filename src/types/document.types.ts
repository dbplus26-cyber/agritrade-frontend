/**
 * The shape of a document as the server describes it - one neutral document
 * behind both renderings, so the sheet on screen and the PDF that prints are
 * the same piece of paper rather than two designs of one.
 *
 * Every figure arrives already formatted. Nothing here is re-derived on the
 * client: a screen that computed its own balance would eventually disagree
 * with the document the buyer is holding.
 */

/** Which document to fetch. Mirrors the server's receipt types. */
export type DocumentType =
  | "account-entry"
  | "account-transfer"
  | "acquisition-payment"
  | "agent-statement"
  | "driver-payment"
  | "expense"
  | "farmer-statement"
  | "grant"
  | "land-acquisition"
  | "land-sale"
  | "land-sale-payment"
  | "purchase"
  | "repayment"
  | "sale"
  | "sale-payment"
  | "shipment";

/** A labelled value in the header block (dates, references, method). */
export interface IDocumentField {
  label: string;
  value: string;
}

/** One row of the document's table. */
export interface IDocumentLine {
  /** The figures column; null leaves it blank (a waybill carries no money). */
  amount?: null | string;
  description: string;
  /** Middle column: weight, quantity, unit price - whatever the type needs. */
  detail?: null | string;
}

/** One payment destination, already flattened to the rows a payer reads out. */
export interface IDocumentPayTo {
  heading: string;
  note?: null | string;
  rows: IDocumentField[];
}

/** One block of the signature row. */
export interface IDocumentSignatureBlock {
  /** Carries the business's saved mark rather than one captured on the spot. */
  business?: boolean;
  caption: string;
  /** A mark captured against this document. Null leaves the rule for ink. */
  imageUrl?: null | string;
  /** Who signed, when, and who held the device. */
  meta?: string[];
}

/** A totals row. `emphasis` marks the bottom line. */
export interface IDocumentTotal {
  emphasis?: boolean;
  label: string;
  value: string;
}

/** Everything on one document. */
export interface IDocument {
  amountHeading?: string;
  company: {
    address?: string;
    email?: string;
    name: string;
    phone?: string;
  };
  detailHeading?: string;
  fields: IDocumentField[];
  footNote?: string;
  lines: IDocumentLine[];
  party?: {
    label: string;
    name: string;
    phone?: null | string;
  };
  payTo?: IDocumentPayTo[];
  /** Already resolved by the server, in the order the row is drawn. */
  signatureBlocks: IDocumentSignatureBlock[];
  stamp?: "CANCELLED" | "PAID" | "VOIDED";
  subtitle?: string;
  title: string;
  totals: IDocumentTotal[];
  transactionNo: string;
}

export interface IDocumentResponse {
  data: { document: IDocument };
  message: string;
}

/** The period a statement is drawn over. Single documents ignore it. */
export interface IDocumentWindow {
  from?: string;
  seasonId?: string;
  to?: string;
}

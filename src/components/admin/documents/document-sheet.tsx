"use client";

import {
  DocumentLogo,
  useDocumentBranding,
} from "@/components/admin/document-marks";
import { cn } from "@/lib/utils";
import type {
  IDocument,
  IDocumentLine,
  IDocumentPayTo,
  IDocumentSignatureBlock,
  IDocumentTotal,
} from "@/types/document.types";

/**
 * A document, drawn on screen exactly as the server draws it on paper.
 *
 * The two renderings share one description of the document: the same blocks in
 * the same order, the same figures already formatted by the adapter that built
 * it. Nothing is computed here and nothing is arranged differently, because a
 * sheet that disagreed with the printed copy would be a second answer about
 * what a counterparty owes.
 *
 * The page is A4 - 794px is the sheet at 96dpi, and the padding is the print
 * margin - so at desk width it IS the printed page. A phone keeps every block,
 * the type scale and the rules, and drops only what a 360px column cannot
 * hold: the sheet's margins narrow and the table's middle column moves under
 * the description it belongs to.
 */
export function DocumentSheet({
  className,
  document,
}: {
  className?: string;
  document: IDocument;
}) {
  return (
    <article
      aria-label={`${document.title} ${document.transactionNo}`}
      className={cn(
        // `relative` carries the stamp; the sheet is white paper on the
        // console's page, squared and hairlined like every other card.
        "relative w-full max-w-[794px] overflow-hidden border border-adm-line bg-white px-5 py-7 text-doc-ink sm:px-9 sm:py-10 lg:px-16 lg:py-14 print:border-0",
        className,
      )}
    >
      {document.stamp ? (
        <>
          {/* The stamp itself is a picture of a word, so the state it carries
              is said once in text for a reader who cannot see it. */}
          <p className="sr-only">This document is marked {document.stamp}.</p>
          <DocumentStamp text={document.stamp} />
        </>
      ) : null}
      <SheetHeader document={document} />
      <SheetMeta document={document} />
      <SheetTable document={document} />
      <SheetTotals totals={document.totals} />
      <SheetSignatures blocks={document.signatureBlocks} />
      <SheetPayTo blocks={document.payTo} />
      {document.footNote ? (
        <p className="relative mt-7 text-[11px] leading-[1.6] text-doc-soil">
          {document.footNote}
        </p>
      ) : null}
      <SheetFooter document={document} />
    </article>
  );
}

/**
 * The word across a document that no longer represents live money. Outlined in
 * the same washed red the PDF prints, so the figures underneath stay readable:
 * a voided receipt still has to be auditable.
 */
function DocumentStamp({ text }: { text: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-[26%] z-10 flex justify-center select-none"
    >
      <span className="-rotate-[22deg] text-[clamp(42px,13vw,78px)] leading-none font-extrabold tracking-[0.14em] whitespace-nowrap text-doc-stamp/16">
        {text}
      </span>
    </div>
  );
}

/** Company block on the left, document title and number on the right. */
function SheetHeader({ document }: { document: IDocument }) {
  const contact = [
    document.company.address,
    document.company.phone,
    document.company.email,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <header className="relative">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 items-start gap-3">
          <DocumentLogo className="h-10 w-10 sm:h-[42px] sm:w-[42px]" />
          <div className="min-w-0">
            <div className="text-[18px] leading-[1.15] font-bold tracking-[0.07em] text-doc-forest uppercase sm:text-[21px]">
              {document.company.name}
            </div>
            {contact ? (
              <div className="mt-1.5 max-w-[38ch] text-[11px] leading-[1.5] text-doc-soil">
                {contact}
              </div>
            ) : null}
          </div>
        </div>

        {/* The title stack keeps its own column so a long one wraps inside it
            rather than running back across the company block. */}
        <div className="min-w-0 sm:max-w-[280px] sm:text-right">
          <h2 className="text-[16px] leading-[1.2] font-bold tracking-[0.09em] uppercase sm:text-[19px]">
            {document.title}
          </h2>
          <div className="mt-1 font-adminmono text-[14px] font-bold break-all text-doc-forest sm:text-[15px]">
            {document.transactionNo}
          </div>
          {document.subtitle ? (
            <div className="mt-1 text-[11px] leading-[1.5] text-doc-soil">
              {document.subtitle}
            </div>
          ) : null}
        </div>
      </div>
      {/* The head of a ledger sheet: a rule and a hairline, not one heavy bar. */}
      <div className="mt-4 border-t border-doc-forest" />
      <div className="mt-[3px] border-t border-doc-rule-strong" />
    </header>
  );
}

/** Who the document is addressed to, and the header fields beside them. */
function SheetMeta({ document }: { document: IDocument }) {
  if (!document.party && document.fields.length === 0) return null;

  return (
    <div className="relative mt-6 grid gap-5 sm:grid-cols-2 sm:gap-10">
      <div>
        {document.party ? (
          <>
            <div className="text-[10px] font-bold tracking-[0.16em] text-doc-soil uppercase">
              {document.party.label}
            </div>
            <div className="mt-1.5 text-[15px] leading-[1.3] font-bold [overflow-wrap:anywhere] sm:text-[16px]">
              {document.party.name}
            </div>
            {document.party.phone ? (
              <div className="mt-0.5 font-adminmono text-[12px] text-doc-soil">
                {document.party.phone}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <dl className="space-y-1">
        {document.fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5"
          >
            <dt className="text-[11px] text-doc-soil">{field.label}</dt>
            <dd className="min-w-0 text-[12px] font-semibold [overflow-wrap:anywhere] sm:text-right">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The line table: description, the type's own middle column, and figures. */
function SheetTable({ document }: { document: IDocument }) {
  const detailHeading = document.detailHeading ?? "Detail";
  const amountHeading = document.amountHeading ?? "Amount";

  return (
    <table className="relative mt-7 w-full table-fixed border-collapse">
      <caption className="sr-only">
        {document.title} {document.transactionNo}
      </caption>
      <thead>
        <tr className="border-b border-doc-rule-strong bg-doc-band text-[10px] tracking-[0.14em] text-doc-soil uppercase">
          <th scope="col" className="px-2 py-2 text-left font-bold">
            Description
          </th>
          <th
            scope="col"
            className="hidden px-2 py-2 text-left font-bold sm:table-cell sm:w-[24%]"
          >
            {detailHeading}
          </th>
          <th
            scope="col"
            className="w-[34%] px-2 py-2 text-right font-bold sm:w-[22%]"
          >
            {amountHeading}
          </th>
        </tr>
      </thead>
      <tbody>
        {document.lines.map((line, index) => (
          <SheetRow
            key={`${line.description}-${String(index)}`}
            detailHeading={detailHeading}
            line={line}
          />
        ))}
        {document.lines.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-2 py-3 text-[12px] text-doc-soil">
              No line items.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

/**
 * One line. The middle column has nowhere to go on a phone, so below `sm` it
 * sits under the description it qualifies - the same two facts, stacked.
 */
function SheetRow({
  detailHeading,
  line,
}: {
  detailHeading: string;
  line: IDocumentLine;
}) {
  return (
    <tr className="border-b border-doc-rule align-top">
      <td className="px-2 py-2.5 text-[13px] leading-[1.45] [overflow-wrap:anywhere]">
        {line.description}
        {line.detail ? (
          <span className="mt-0.5 block font-adminmono text-[11.5px] text-doc-soil sm:hidden">
            {detailHeading}: {line.detail}
          </span>
        ) : null}
      </td>
      <td className="hidden px-2 py-2.5 font-adminmono text-[12px] text-doc-soil sm:table-cell">
        {line.detail ?? ""}
      </td>
      <td className="px-2 py-2.5 text-right font-adminmono text-[13px] tabular-nums">
        {line.amount ?? ""}
      </td>
    </tr>
  );
}

/** The totals stack, with the bottom line in a band of its own. */
function SheetTotals({ totals }: { totals: IDocumentTotal[] }) {
  if (totals.length === 0) return null;

  return (
    <div className="relative mt-4 flex justify-end">
      <div className="w-full sm:w-[46%] sm:min-w-[280px]">
        {totals.map((total) =>
          total.emphasis ? (
            <div
              key={total.label}
              className="mt-2 flex items-center justify-between gap-4 border-t border-doc-forest bg-doc-band px-3 py-2.5"
            >
              <span className="text-[11px] font-bold tracking-[0.1em] text-doc-soil uppercase">
                {total.label}
              </span>
              <span className="font-adminmono text-[15px] font-bold tabular-nums text-doc-forest">
                {total.value}
              </span>
            </div>
          ) : (
            <div
              key={total.label}
              className="flex items-baseline justify-between gap-4 px-3 py-1"
            >
              <span className="text-[12px] text-doc-soil">{total.label}</span>
              <span className="font-adminmono text-[12.5px] tabular-nums">
                {total.value}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/** The signature row, in the order the document declares it. */
function SheetSignatures({ blocks }: { blocks: IDocumentSignatureBlock[] }) {
  const { signatureUrl } = useDocumentBranding();
  if (blocks.length === 0) return null;

  return (
    <div className="relative mt-10 flex flex-wrap justify-end gap-x-8 gap-y-7">
      {blocks.map((block) => {
        // A block that carries the business's mark takes it from the saved
        // signature; one signed against this document carries its own.
        const mark = block.business ? signatureUrl : block.imageUrl;
        return (
          <div
            key={block.caption}
            className="w-[170px] max-w-full grow basis-[150px] sm:grow-0"
          >
            <div className="flex h-[38px] items-end justify-center">
              {mark ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary or public asset
                <img
                  src={mark}
                  alt={block.caption}
                  className="max-h-[34px] max-w-[140px] object-contain"
                />
              ) : null}
            </div>
            <div className="border-t border-doc-soil pt-1.5 text-center text-[10px] font-bold tracking-[0.08em] text-doc-soil uppercase">
              {block.caption}
            </div>
            {(block.meta ?? []).map((line) => (
              <div
                key={line}
                className="mt-0.5 text-center text-[9.5px] leading-[1.4] text-doc-soil"
              >
                {line}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Where to send the money - only ever printed while something is owed. */
function SheetPayTo({ blocks }: { blocks?: IDocumentPayTo[] }) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <section className="relative mt-9">
      <h3 className="text-[11px] font-bold tracking-[0.16em] text-doc-forest uppercase">
        How to pay
      </h3>
      <div className="mt-1.5 border-t border-doc-rule-strong" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {blocks.map((block) => (
          <div
            key={block.heading}
            className="break-inside-avoid border border-doc-rule-strong px-3 py-2.5"
          >
            <div className="text-[12px] font-bold text-doc-forest">
              {block.heading}
            </div>
            <dl className="mt-1.5">
              {block.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-baseline gap-x-2 py-[1px] text-[11px]"
                >
                  <dt className="text-doc-soil">{row.label}:</dt>
                  <dd className="min-w-0 font-adminmono font-semibold break-all">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            {block.note ? (
              <p className="mt-2 text-[10.5px] leading-[1.5] text-doc-soil">
                {block.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/** The band that closes the sheet, as it closes every page of the PDF. */
function SheetFooter({ document }: { document: IDocument }) {
  return (
    <footer className="relative mt-10 border-t border-doc-rule-strong pt-2 text-[10px] leading-[1.5] text-doc-soil">
      <span className="font-adminmono">{document.transactionNo}</span>
      {"  ·  "}
      This is a computer-generated document from {document.company.name}.
    </footer>
  );
}

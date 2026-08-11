"use client";

import Link from "next/link";
import { flexRender, type Table } from "@tanstack/react-table";
import { HelpTip } from "@/components/admin/help-tip";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type { IApproval } from "@/types/approval.types";
import {
  apFieldKey,
  apLink,
  auditTrail,
  NoteBlock,
  overageSentence,
  RAIL,
  sourceLabel,
} from "./queue-bits";

/**
 * The dense queue.
 *
 * Two structural decisions worth stating, because both look odd next to a
 * normal console table:
 *
 * 1. CSS grid, not `<table>`. The 900px collapse folds six cells into one
 *    column with a row gap, which a table element cannot do without
 *    `display: block` overrides that throw away the semantics anyway.
 *
 * 2. The row's click target is an absolutely positioned button UNDER the
 *    cells rather than a button wrapping them. A checkbox and two action
 *    buttons live in this row; nesting them inside a button is invalid HTML
 *    and breaks keyboard order. Non-interactive cells therefore sit on
 *    `pointer-events: none` so a click anywhere on them reaches the expand
 *    button beneath, while the checkbox and the Approve/Reject pair opt back
 *    in and stop propagation.
 */

/**
 * The column grid, shared by the header and every row so the two can never
 * drift apart.
 *
 * The 900px breakpoint is a CONTAINER query against the console's content
 * area, not a viewport media query. The sidebar takes ~225px, so a 900px-wide
 * window leaves the table barely 635px - a viewport query would keep the
 * seven fixed columns in place at exactly the width where they no longer fit.
 * Narrow is the base case; the full grid is the enhancement.
 */
const GRID =
  "grid grid-cols-1 items-start gap-[14px] gap-y-2.5 " +
  "@min-[900px]/main:grid-cols-[34px_190px_1fr_150px_118px_190px_26px] " +
  "@min-[900px]/main:items-center @min-[900px]/main:gap-y-[14px]";

export function ApprovalsQueue({ table }: { table: Table<IApproval> }) {
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-none border border-[var(--ap-hair)] bg-[var(--ap-surface)]">
      {table.getHeaderGroups().map((group) => (
        <div
          key={group.id}
          className={cn(
            GRID,
            "border-b border-[var(--ap-hair)] bg-[var(--ap-surface-alt)] px-4 py-[9px]",
            "text-[10.5px] leading-[1.4] font-[650] tracking-[0.09em] text-[var(--ap-muted)] uppercase",
            "hidden @min-[900px]/main:grid",
          )}
        >
          {group.headers.map((header) => (
            <div
              key={header.id}
              className={cn("min-w-0", header.column.columnDef.meta?.headerClassName)}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
          ))}
        </div>
      ))}

      {rows.map((row, index) => {
        const approval = row.original;
        const open = row.getIsExpanded();
        const detailId = `approval-detail-${approval.id}`;

        return (
          <div
            key={row.id}
            className={cn(
              "relative",
              index < rows.length - 1 && "border-b border-[var(--ap-hair-soft)]",
            )}
          >
            {/* The rail owns the whole record, expanded panel included. */}
            <span
              aria-hidden="true"
              className="absolute top-0 bottom-0 left-0 w-[3px]"
              style={{ background: RAIL[approval.status] }}
            />

            <div className="relative hover:bg-[var(--ap-surface-alt)]">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={detailId}
                onClick={row.getToggleExpandedHandler()}
                className="absolute inset-0 z-0 w-full cursor-pointer focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--ap-forest)]"
              >
                <span className="sr-only">
                  {open ? "Hide details for" : "Show details for"}{" "}
                  {approval.subject}
                  {approval.sourceRef ? ` ${approval.sourceRef}` : ""}
                </span>
              </button>

              <div className={cn(GRID, "pointer-events-none relative z-10 px-4 py-[13px]")}>
                {row.getVisibleCells().map((cell, cellIndex) => (
                  <div
                    key={cell.id}
                    className={cn(
                      "min-w-0",
                      // Narrow: the checkbox column disappears - bulk select
                      // is a wide-screen workflow, and its 26px column plus
                      // the grid gap squeezed every stacked cell 40px off the
                      // row edge on a phone. The cells own the full width;
                      // the checkbox returns with the full grid.
                      cellIndex === 0 && "hidden @min-[900px]/main:block",
                      cell.column.columnDef.meta?.className,
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            </div>

            {open ? (
              <ApprovalDetailPanel id={detailId} approval={approval} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The expanded panel. Height is not animated on purpose - a row that snaps
 * open is instantly legible, and an animated one makes a queue you are
 * skimming feel slower than it is.
 */
export function ApprovalDetailPanel({
  approval,
  id,
}: {
  approval: IApproval;
  id: string;
}) {
  const overage = overageSentence(approval);

  return (
    <div
      id={id}
      className="border-t border-[var(--ap-hair-soft)] bg-[var(--ap-surface-alt)] pt-0.5 pr-4 pb-[18px] pl-4 @min-[900px]/main:pl-[54px]"
    >
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-[26px] gap-y-4 pt-4 pb-1">
        <Field label="Source record">
          <Link href={approval.sourceHref} className={apLink}>
            {sourceLabel(approval)}
          </Link>
        </Field>
        {approval.warehouse ? (
          <Field label="Warehouse">{approval.warehouse}</Field>
        ) : null}
        {approval.limit !== null ? (
          <Field
            label="Limit breached"
            hint="The most staff may commit on their own before this has to come to you."
          >
            <span className="font-adminmono tabular-nums">
              {formatCedis(approval.limit)}
            </span>
            {approval.limitIsCurrent ? (
              // The threshold was never snapshotted on the request, so this is
              // the setting as it stands today - say so rather than passing it
              // off as what the decision was measured against.
              <span className="text-[var(--ap-muted)]"> (current setting)</span>
            ) : null}
          </Field>
        ) : null}
        {overage ? (
          <Field
            label="Overage"
            hint="How far past the limit this one goes, in money and as a percentage."
          >
            <span className="font-adminmono tabular-nums">{overage}</span>
          </Field>
        ) : null}
      </dl>

      {approval.note ? <NoteBlock note={approval.note} /> : null}

      <p className="mt-4 font-adminmono text-[12px] leading-[1.5] text-[var(--ap-muted)] [overflow-wrap:anywhere]">
        {auditTrail(approval)}
      </p>
    </div>
  );
}

function Field({
  hint,
  label,
  children,
}: {
  /** One sentence on what the fact is, on hover beside its label. */
  hint?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className={cn(apFieldKey, "mb-[3px]", "flex items-center gap-1")}>
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What is ${label}?`} text={hint} /> : null}
      </dt>
      <dd className="text-[13px] leading-[1.5] text-[var(--ap-ink)] [overflow-wrap:anywhere]">
        {children}
      </dd>
    </div>
  );
}

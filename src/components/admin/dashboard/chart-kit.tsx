"use client";

import { HelpTip } from "@/components/admin/help-tip";
import { AdminCard } from "@/components/admin/ui";
import { EmptyFolder } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

/**
 * Shared dashboard chart primitives: the console chart palette, a card shell
 * with the standard uppercase micro-label header, and small number formatters.
 * Every dashboard widget composes these so the board reads as one system.
 */

/** Categorical series colours (forest, blue, gold, sage, clay) for charts. */
export const CHART_COLORS = [
  "#1E3D2B",
  "#3E6B8C",
  "#B8860B",
  "#7A9B76",
  "#C4772E",
] as const;

/** Muted axis/grid tokens tuned to the console's slate chrome. */
export const AXIS_TICK = "#64748b";
export const GRID_STROKE = "#e2e8f0";

export const colorFor = (index: number): string =>
  CHART_COLORS[index % CHART_COLORS.length];

/** kg → a compact weight string: tonnes once past 1 t, kg below. */
export const formatWeight = (kg: number): string =>
  kg >= 1000
    ? `${(kg / 1000).toLocaleString("en-GH", { maximumFractionDigits: 1 })} t`
    : `${Math.round(kg).toLocaleString("en-GH")} kg`;

/** A short axis label for tonnes (no unit suffix - the header carries it). */
export const tonnesTick = (kg: number): string =>
  (kg / 1000).toLocaleString("en-GH", { maximumFractionDigits: 1 });

/** Compact cedis for chart axes/labels: 1.2k, 3.4M (no cedi sign - headers add it). */
export const cedisTick = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("en-GH", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1000)
    return `${(v / 1000).toLocaleString("en-GH", { maximumFractionDigits: 1 })}k`;
  return v.toLocaleString("en-GH", { maximumFractionDigits: 0 });
};

/** The uppercase micro-label header shared by every dashboard card. */
export function CardHeader({
  hint,
  title,
  right,
}: {
  /**
   * One sentence on what the card is showing, on hover beside the heading.
   *
   * A chart's heading is three words at most and its axes are numbers: a
   * reader who does not already know what "cashflow" counts has nowhere else
   * on the card to find out. This is that place.
   */
  hint?: string;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    // The heading never wraps and never shrinks; whatever sits on the right
    // (a legend, a link) takes the room that is left and wraps there instead.
    // Previously both sides could shrink, so a long legend squeezed "Volume
    // bought (t)" into a three-line column - the heading, the one fixed thing
    // on the card, was the piece being pushed around.
    //
    // items-start, not centre: when the right-hand side wraps to two or three
    // lines, centring drags the heading down to float in the middle of them.
    <div className="mb-3 flex items-start justify-between gap-3">
      <span className="flex-none pt-px inline-flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        {title}
        {hint ? <HelpTip label={`What does ${title} show?`} text={hint} /> : null}
      </span>
      {right ? <span className="min-w-0 text-right">{right}</span> : null}
    </div>
  );
}

/** A dashboard card: the console card + a standard header, padding baked in. */
export function WidgetCard({
  children,
  className,
  hint,
  right,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  /** Passed straight to CardHeader - one sentence on what the card shows. */
  hint?: string;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <AdminCard className={cn("min-w-0 px-5 py-4", className)}>
      <CardHeader title={title} hint={hint} right={right} />
      {children}
    </AdminCard>
  );
}

/** A legend dot + label + optional trailing value, reused across widgets. */
export function LegendItem({
  className,
  color,
  label,
  value,
}: {
  className?: string;
  color: string;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    // min-w-0 on BOTH the row and the label. A flex item defaults to
    // `min-width: auto`, meaning it refuses to shrink below its content - so
    // `truncate` on the label had nothing to clamp against and a long
    // commodity name ran straight out past the card's edge.
    <span className={cn("flex min-w-0 items-center gap-1.5 text-[11.5px] text-adm-muted", className)}>
      <span
        aria-hidden="true"
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: color }}
      />
      <span className="min-w-0 truncate" title={label}>
        {label}
      </span>
      {value !== undefined ? (
        <span className="font-semibold text-adm-ink">{value}</span>
      ) : null}
    </span>
  );
}

/** Small centred empty/hidden note inside a chart card. */
export function ChartNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-center text-[13px] text-adm-muted">
      {children}
    </div>
  );
}

/**
 * The no-data state for a dashboard or report widget - one shape everywhere.
 *
 * Widgets used to say "nothing here" three different ways (ChartNote, a bare
 * muted paragraph, or nothing at all), so an empty board read as several
 * different products. This is the registers' folder mark scaled to widget
 * size, with the same title/hint hierarchy as EmptyState. Keep ChartNote for
 * REDACTION notes ("hidden for your role") - that is a different message from
 * "there is no data", and the two must not look alike.
 *
 * `className` sets the slot height so a chart card keeps its chart height
 * (e.g. "h-[180px]") and a list card its list height (default min-h-[120px]).
 */
export function WidgetEmpty({
  title,
  hint,
  className,
}: {
  /** What is absent, plainly, e.g. "No activity yet". */
  title: string;
  /** One line on when data will appear here. */
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-[6px] border border-dashed border-adm-hairline bg-adm-page/60 px-4 py-5 text-center",
        className,
      )}
    >
      <EmptyFolder className="mb-1 h-9 w-auto" />
      <p className="text-[13px] font-semibold text-adm-ink">{title}</p>
      {hint ? (
        <p className="max-w-[36ch] text-[12.5px] leading-[1.55] text-adm-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The failure state for a dashboard widget that owns its own query.
 *
 * These widgets all used to branch on `isLoading || !data`, which is TRUE
 * forever once a request has failed - so a dead endpoint left a skeleton
 * pulsing indefinitely, or worse, fell through to an empty state that read
 * as a real zero. On a board of money figures, "we could not load this" and
 * "this is nothing" must never look the same. Sized to sit inside a widget
 * card without resizing the row it lives in.
 */
export function WidgetError({
  onRetry,
  what,
}: {
  onRetry: () => void;
  /** What failed, lowercase, e.g. "the day's figures". */
  what: string;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-console-red/35 bg-console-red/[0.03] px-4 py-4 text-center"
    >
      <p className="text-[12.5px] text-adm-muted">Couldn&apos;t load {what}.</p>
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer text-[12.5px] font-semibold text-console-red underline underline-offset-2 hover:no-underline"
      >
        Try again
      </button>
    </div>
  );
}

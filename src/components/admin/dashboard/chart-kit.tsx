"use client";

import { AdminCard } from "@/components/admin/ui";
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
  title,
  right,
}: {
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {title}
      </span>
      {right}
    </div>
  );
}

/** A dashboard card: the console card + a standard header, padding baked in. */
export function WidgetCard({
  children,
  className,
  right,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
  title: string;
}) {
  return (
    <AdminCard className={cn("min-w-0 px-5 py-4", className)}>
      <CardHeader title={title} right={right} />
      {children}
    </AdminCard>
  );
}

/** A legend dot + label + optional trailing value, reused across widgets. */
export function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-[11.5px] text-soil">
      <span
        aria-hidden="true"
        className="h-2 w-2 flex-none rounded-full"
        style={{ background: color }}
      />
      <span className="truncate">{label}</span>
      {value !== undefined ? (
        <span className="font-semibold text-ink">{value}</span>
      ) : null}
    </span>
  );
}

/** Small centred empty/hidden note inside a chart card. */
export function ChartNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-center text-[13px] text-soil">
      {children}
    </div>
  );
}

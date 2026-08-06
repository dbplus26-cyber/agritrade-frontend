"use client";

import { useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  cedisTick,
  ChartNote,
  GRID_STROKE,
  LegendItem,
  WidgetCard,
} from "@/components/admin/dashboard/chart-kit";
import { Money } from "@/components/admin/trading/sale-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTrendsQuery } from "@/redux/reports/reports-api";

/** "2026-07" → "Jul". */
const monthLabel = (key: string): string => {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
  });
};

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: { color?: string; name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] border border-adm-line bg-adm-card px-3 py-2 text-[12px] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="mb-1 font-semibold text-adm-ink">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <LegendItem color={p.color ?? "#999"} label={p.name} />
          <span className="font-semibold text-adm-ink">
            <Money value={p.value} />
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Month-over-month sales-in vs purchases-out trend (design doc 9). Owns its own
 * query with a 6/12-month toggle; redaction-aware.
 */
export function PlTrendChart() {
  const [months, setMonths] = useState<12 | 6>(6);
  const { data, isLoading } = useGetTrendsQuery({ months });
  const points = data?.data ?? [];

  const redacted =
    points.length > 0 &&
    points.every((p) => p.salesGhs === null && p.purchasesGhs === null);
  const rows = points.map((p) => ({
    label: monthLabel(p.month),
    purchasesGhs: p.purchasesGhs ?? 0,
    salesGhs: p.salesGhs ?? 0,
  }));

  const toggle = (
    <div className="flex items-center gap-1">
      {([6, 12] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMonths(m)}
          className={
            months === m
              ? "rounded-[4px] bg-console px-2 py-0.5 text-[11px] font-semibold text-white"
              : "cursor-pointer rounded-[4px] px-2 py-0.5 text-[11px] font-semibold text-adm-muted hover:bg-adm-sunken"
          }
        >
          {m}m
        </button>
      ))}
    </div>
  );

  return (
    <WidgetCard
      title="Sales in vs purchases out"
      hint="Money coming in from buyers set against money going out to sellers, month by month."
      right={toggle}
    >
      {isLoading ? (
        <Skeleton className="h-[240px] w-full rounded-[6px]" />
      ) : redacted ? (
        <ChartNote>Financial figures are hidden for your role.</ChartNote>
      ) : rows.length === 0 ? (
        <ChartNote>No activity in this period.</ChartNote>
      ) : (
        <div className="h-[240px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -4 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3E7D62" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#3E7D62" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID_STROKE }}
              />
              <YAxis
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={cedisTick}
                width={44}
              />
              <Tooltip content={<TrendTooltip />} />
              <Area
                type="monotone"
                dataKey="salesGhs"
                name="Sales in"
                stroke="#3E7D62"
                strokeWidth={2}
                fill="url(#salesFill)"
              />
              <Line
                type="monotone"
                dataKey="purchasesGhs"
                name="Purchases out"
                stroke="#C4772E"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}

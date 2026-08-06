"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { ToneBadge } from "@/components/admin/ui";
import type { ICommodityProfit } from "@/types/report.types";

/** Revenue / cost / gross-profit grouped bars per commodity. */
const SERIES = [
  { color: "#3E6B8C", key: "revenueGhs", label: "Revenue" },
  { color: "#C4772E", key: "costGhs", label: "Cost" },
  { color: "#1E3D2B", key: "grossProfitGhs", label: "Gross profit" },
] as const;

type Row = { costGhs: number; grossProfitGhs: number; name: string; revenueGhs: number };

function ProfitTooltip({
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
 * Gross-profit-by-commodity as grouped revenue/cost/gross bars. Redaction-aware:
 * staff without financial visibility get null money, so the chart shows an
 * honest hidden state rather than a wall of zeroes.
 */
export function ProfitBarChart({
  hasEstimated,
  rows,
}: {
  hasEstimated?: boolean;
  rows: ICommodityProfit[];
}) {
  const redacted = rows.length > 0 && rows.every((r) => r.grossProfitGhs === null);
  const data: Row[] = rows.map((r) => ({
    costGhs: r.costGhs ?? 0,
    grossProfitGhs: r.grossProfitGhs ?? 0,
    name: r.commodityName,
    revenueGhs: r.revenueGhs ?? 0,
  }));

  const legend = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {SERIES.map((s) => (
        <LegendItem key={s.key} color={s.color} label={s.label} />
      ))}
      {hasEstimated ? <ToneBadge tone="harvest">Est.</ToneBadge> : null}
    </span>
  );

  return (
    <WidgetCard
      title="Profit by commodity"
      hint="What each crop earned you after what it cost to buy, on sales shipped in the period you picked."
      right={rows.length > 0 && !redacted ? legend : undefined}
    >
      {rows.length === 0 ? (
        <ChartNote>No shipped sales in this period yet.</ChartNote>
      ) : redacted ? (
        <ChartNote>Financial figures are hidden for your role.</ChartNote>
      ) : (
        <div className="h-[240px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -4 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID_STROKE }}
                minTickGap={8}
              />
              <YAxis
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={cedisTick}
                width={44}
              />
              <Tooltip
                content={<ProfitTooltip />}
                cursor={{ fill: "rgba(100,116,139,0.08)" }}
              />
              {SERIES.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  maxBarSize={26}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}

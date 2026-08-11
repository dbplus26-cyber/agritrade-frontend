"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCedis } from "@/lib/format-money";
import { useGetCashflowQuery } from "@/redux/reports/reports-api";
import type { IReportWindow } from "@/types/report.types";

import {
  AXIS_TICK,
  ChartNote,
  WidgetEmpty,
  GRID_STROKE,
  LegendItem,
  WidgetCard,
  WidgetError,
} from "./chart-kit";

const SALES = "#3E6B8C";
const PURCHASES = "#B8860B";

/** GH₵ compacted for the y-axis: "12k", "1.2k", "840". */
const compactCedis = (v: number): string =>
  Math.abs(v) >= 1000
    ? `${(v / 1000).toLocaleString("en-GH", { maximumFractionDigits: 1 })}k`
    : String(Math.round(v));

interface Row {
  label: string;
  purchasesOutGhs: number;
  salesInGhs: number;
}

function CashflowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: { dataKey: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const get = (k: string) => payload.find((p) => p.dataKey === k)?.value ?? 0;
  return (
    <div className="rounded-none border border-adm-line bg-adm-card px-3 py-2 text-[12px] shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <div className="mb-1 font-semibold text-adm-ink">{label}</div>
      <div className="flex items-center justify-between gap-4">
        <LegendItem color={SALES} label="Sales in" />
        <span className="font-semibold text-adm-ink">{formatCedis(get("salesInGhs"))}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <LegendItem color={PURCHASES} label="Purchases out" />
        <span className="font-semibold text-adm-ink">
          {formatCedis(get("purchasesOutGhs"))}
        </span>
      </div>
    </div>
  );
}

/**
 * Cashflow over the window: money in (payments received) vs money out
 * (purchases). Money-visibility aware - staff without financial visibility get
 * an honest "hidden" note rather than a chart of zeros.
 */
export function CashflowChart({ window }: { window: IReportWindow }) {
  const { data, isError, isLoading, refetch } = useGetCashflowQuery(window);
  const points = data?.data.points ?? [];
  const redacted =
    points.length > 0 && points.every((p) => p.salesInGhs === null);

  const rows: Row[] = points.map((p) => ({
    label: p.label,
    purchasesOutGhs: p.purchasesOutGhs ?? 0,
    salesInGhs: p.salesInGhs ?? 0,
  }));

  const legend = (
    <span className="flex items-center gap-3">
      <LegendItem color={SALES} label="Sales in" />
      <LegendItem color={PURCHASES} label="Purchases out" />
    </span>
  );

  return (
    <WidgetCard
      title="Cashflow"
      hint="Money buyers paid you against money you spent buying grain, day by day over the period you picked."
      right={legend}
    >
      {isError ? (
        <WidgetError what="the cashflow" onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-none" />
      ) : redacted ? (
        <ChartNote>Cashflow figures are hidden for your role.</ChartNote>
      ) : rows.length === 0 ? (
        <WidgetEmpty
          className="h-[220px]"
          title="No money moved in this period"
          hint="Payments in and purchases out will draw here as they are recorded."
        />
      ) : (
        <div className="h-[220px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SALES} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={SALES} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="purchasesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PURCHASES} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={PURCHASES} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID_STROKE }}
                minTickGap={16}
              />
              <YAxis
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={compactCedis}
                width={44}
              />
              <Tooltip
                content={<CashflowTooltip />}
                cursor={{ stroke: GRID_STROKE }}
              />
              <Area
                type="monotone"
                dataKey="salesInGhs"
                stroke={SALES}
                strokeWidth={2}
                fill="url(#salesFill)"
              />
              <Area
                type="monotone"
                dataKey="purchasesOutGhs"
                stroke={PURCHASES}
                strokeWidth={2}
                fill="url(#purchasesFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}

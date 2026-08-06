"use client";

import { HelpTip } from "@/components/admin/help-tip";
import { Money } from "@/components/admin/trading/sale-bits";
import { AdminCard, Mono } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCedisCompact,
  formatKg,
  statValueCls,
} from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useGetPeriodSummaryQuery } from "@/redux/reports/reports-api";
import type { IReportWindow, ITrend } from "@/types/report.types";

import { TrendBadge } from "./trend-badge";

/** One windowed stat tile: label, mono value, optional sub + trend. */
function Tile({
  hint,
  inverse = false,
  label,
  sub,
  trend,
  value,
  valueText,
}: {
  /** One sentence on what the figure counts, on hover beside the label. */
  hint?: string;
  inverse?: boolean;
  label: string;
  sub?: React.ReactNode;
  trend?: ITrend;
  value: React.ReactNode;
  /** The rendered figure as text, so the type scale can adapt to its length. */
  valueText?: string;
}) {
  return (
    <AdminCard className="min-w-0 px-3 py-2.5">
      {/* The label owns its own line. Sharing a row with the trend badge made
          them collide at 280px ("PURCHASE▲33.8%"), and the badge reads better
          beside the figure it describes anyway. */}
      <div className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What does ${label} count?`} text={hint} /> : null}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-1.5">
        <Mono
          className={cn(
            "min-w-0 font-bold text-adm-ink",
            valueText ? statValueCls(valueText) : "text-[18px]",
          )}
        >
          {value}
        </Mono>
        {trend ? (
          <span className="flex-none">
            <TrendBadge trend={trend} inverse={inverse} />
          </span>
        ) : null}
      </div>
      {sub ? <div className="mt-0.5 text-[12px] text-adm-muted">{sub}</div> : null}
    </AdminCard>
  );
}

/**
 * The windowed flow strip (design doc 9): money out, money in, sales confirmed
 * and expenses over the selected window, each with a period-over-period trend.
 * Owns its own query so it loads independently of the rest of the board.
 */
export function PeriodSummary({ window }: { window: IReportWindow }) {
  const { data, isLoading } = useGetPeriodSummaryQuery(window);
  const s = data?.data;

  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold tracking-[0.04em] text-adm-muted/80 uppercase">
        In selected period
      </div>
      {isLoading || !s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[74px] w-full rounded-[6px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile
            label="Purchases out"
            hint="What you spent buying grain in the period you picked, agents and suppliers together."
            value={<Money compact value={s.purchasesGhs} />}
            valueText={formatCedisCompact(s.purchasesGhs)}
            sub={`${formatKg(s.purchasesKg)} · ${String(s.purchaseCount)} buys`}
            trend={s.purchasesTrend}
            inverse
          />
          <Tile
            label="Payments in"
            hint="Money buyers actually paid you in the period you picked, not what they agreed to pay."
            value={<Money compact value={s.paymentsInGhs} />}
            valueText={formatCedisCompact(s.paymentsInGhs)}
            trend={s.paymentsInTrend}
          />
          <Tile
            label="Sales confirmed"
            hint="What buyers agreed to pay on orders confirmed in the period you picked."
            value={<Money compact value={s.salesConfirmedGhs} />}
            valueText={formatCedisCompact(s.salesConfirmedGhs)}
            sub={`${String(s.salesConfirmedCount)} sales`}
            trend={s.salesConfirmedTrend}
          />
          <Tile
            label="Expenses"
            hint="Running costs recorded in the period you picked: transport, loading, fees and the rest."
            value={<Money compact value={s.expensesGhs} />}
            valueText={formatCedisCompact(s.expensesGhs)}
            inverse
          />
        </div>
      )}
    </div>
  );
}

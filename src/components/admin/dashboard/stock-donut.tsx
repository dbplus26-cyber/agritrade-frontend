"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { ChartNote, colorFor, formatWeight, LegendItem, WidgetCard } from "./chart-kit";

interface StockRow {
  commodityId: string;
  commodityName: string;
  onHandKg: number;
}

/**
 * Current stock composition donut (state now, not windowed): each commodity's
 * share of total stock on hand, with the total in the centre and a per-commodity
 * kg + % legend. Fed from the snapshot dashboard read.
 */
export function StockDonut({ rows }: { rows: StockRow[] }) {
  const total = rows.reduce((a, r) => a + r.onHandKg, 0);
  const slices = rows.map((r, i) => ({
    color: colorFor(i),
    name: r.commodityName,
    pct: total > 0 ? (r.onHandKg / total) * 100 : 0,
    value: r.onHandKg,
  }));

  return (
    <WidgetCard
      title="Stock mix"
      hint="How the stock you are holding right now splits across the commodities you trade."
    >
      {total <= 0 ? (
        <ChartNote>No stock on hand.</ChartNote>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-[168px] w-[168px] flex-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={80}
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  stroke="none"
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[17px] font-bold text-adm-ink">
                {formatWeight(total)}
              </span>
              <span className="text-[9.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                On hand
              </span>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5">
            {slices.map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-2">
                <LegendItem color={s.color} label={s.name} />
                <span className="flex-none text-[11.5px] text-adm-muted">
                  <span className="font-semibold text-adm-ink">
                    {formatWeight(s.value)}
                  </span>{" "}
                  · {s.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

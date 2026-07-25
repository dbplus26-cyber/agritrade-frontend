"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  ChartNote,
  colorFor,
  LegendItem,
  WidgetCard,
} from "@/components/admin/dashboard/chart-kit";
import { Money } from "@/components/admin/trading/sale-bits";
import type { IExpenseSummary } from "@/types/report.types";

/**
 * Expense breakdown donut by category, with a legend carrying each category's
 * amount and share. Redaction-aware (staff without visibility get an honest
 * hidden state instead of an empty ring).
 */
export function ExpenseDonut({ summary }: { summary?: IExpenseSummary }) {
  const cats = summary?.byCategory ?? [];
  const total = summary?.totalGhs ?? null;
  const redacted = cats.length > 0 && cats.every((c) => c.amountGhs === null);

  const slices = cats
    .map((c) => ({
      amount: c.amountGhs ?? 0,
      id: c.categoryId,
      name: c.categoryName,
    }))
    .filter((s) => s.amount > 0);
  const sum = slices.reduce((a, s) => a + s.amount, 0);

  return (
    <WidgetCard title="Expenses by category">
      {cats.length === 0 ? (
        <ChartNote>No expenses recorded in this period.</ChartNote>
      ) : redacted ? (
        <ChartNote>Financial figures are hidden for your role.</ChartNote>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-[168px] w-[168px] flex-none">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={80}
                  paddingAngle={1.5}
                  stroke="none"
                >
                  {slices.map((s, i) => (
                    <Cell key={s.id} fill={colorFor(i)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[15px] font-bold text-ink">
                <Money value={total} />
              </span>
              <span className="text-[9.5px] font-semibold tracking-[0.08em] text-soil uppercase">
                Total
              </span>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5">
            {slices.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <LegendItem color={colorFor(i)} label={s.name} />
                <span className="flex flex-none items-center gap-2 text-[12px]">
                  <span className="font-semibold text-ink">
                    <Money value={s.amount} />
                  </span>
                  <span className="text-soil">
                    {sum > 0 ? Math.round((s.amount / sum) * 100) : 0}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

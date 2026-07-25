"use client";

import { useState } from "react";
import {
  DateRangeSelector,
  DEFAULT_RANGE,
} from "@/components/admin/dashboard/date-range-selector";
import { Money } from "@/components/admin/trading/sale-bits";
import { AdminButton, AdminCard, Mono, ToneBadge } from "@/components/admin/ui";
import { env } from "@/lib/env";
import { formatKg } from "@/lib/format-money";
import { toQueryString } from "@/lib/to-query-string";
import { cn } from "@/lib/utils";
import {
  useGetAgentPerformanceQuery,
  useGetExpenseSummaryQuery,
  useGetProfitReportQuery,
} from "@/redux/reports/reports-api";
import type { IReportWindow } from "@/types/report.types";

import { DebtorsTable } from "./debtors-table";
import { ExpenseDonut } from "./expense-donut";
import { PlTrendChart } from "./pl-trend-chart";
import { ProfitBarChart } from "./profit-bar-chart";

const EXPORTS = `${env.SERVER_URI}/api/v1/admin/reports/exports`;

/** A KPI tile on the reports header. */
function ReportKpi({
  accent = false,
  label,
  value,
}: {
  accent?: boolean;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <AdminCard className="px-4 py-3">
      <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[18px] font-bold",
          accent ? "text-leaf" : "text-ink",
        )}
      >
        {value}
      </div>
    </AdminCard>
  );
}

/** The condensed P&L statement from the profit summary + expenses. */
function PlStatement({ window }: { window: IReportWindow }) {
  const profit = useGetProfitReportQuery(window);
  const expenses = useGetExpenseSummaryQuery(window);
  const s = profit.data?.data.summary;
  const cats = expenses.data?.data.byCategory ?? [];

  const rowClass = "flex items-center justify-between py-1.5 text-[13.5px]";
  return (
    <AdminCard className="px-5 py-4">
      <div className="mb-2 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        Profit &amp; loss
      </div>
      <div className={rowClass}>
        <span className="text-ink">Revenue</span>
        <Mono className="text-ink">
          <Money value={s?.revenueGhs ?? null} />
        </Mono>
      </div>
      <div className={cn(rowClass, "text-soil")}>
        <span className="flex items-center gap-1.5">
          Cost of goods sold
          {s?.hasEstimated ? <ToneBadge tone="harvest">Est.</ToneBadge> : null}
        </span>
        <Mono>
          <Money value={s?.costGhs ?? null} />
        </Mono>
      </div>
      <div
        className={cn(
          rowClass,
          "border-t border-soil/15 font-semibold text-ink",
        )}
      >
        <span>Gross profit</span>
        <Mono>
          <Money value={s?.grossProfitGhs ?? null} />
        </Mono>
      </div>
      {cats.map((c) => (
        <div key={c.categoryId} className={cn(rowClass, "pl-3 text-soil")}>
          <span>{c.categoryName}</span>
          <Mono>
            <Money value={c.amountGhs} />
          </Mono>
        </div>
      ))}
      <div
        className={cn(
          rowClass,
          "border-t border-soil/15 text-[15px] font-bold text-leaf",
        )}
      >
        <span>Net profit</span>
        <Mono>
          <Money value={s?.netProfitGhs ?? null} />
        </Mono>
      </div>
    </AdminCard>
  );
}

function AgentPerformance({
  exportHref,
  window,
}: {
  exportHref: string;
  window: IReportWindow;
}) {
  const { data } = useGetAgentPerformanceQuery(window);
  const rows = data?.data ?? [];
  return (
    <AdminCard className="px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Agent performance
        </span>
        <a href={exportHref} className="text-[12px] text-console hover:underline">
          Export CSV
        </a>
      </div>
      {rows.length === 0 ? (
        <p className="text-[13px] text-soil">No agent purchases in this period.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] text-soil uppercase">
                <th className="py-1.5">Agent</th>
                <th className="py-1.5 text-right">Buys</th>
                <th className="py-1.5 text-right">Weight</th>
                <th className="py-1.5 text-right">Avg/kg</th>
                <th className="py-1.5 text-right">Spent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.agentName} className="border-t border-soil/10">
                  <td className="py-1.5 text-ink">{r.agentName}</td>
                  <td className="py-1.5 text-right text-soil">{r.purchases}</td>
                  <td className="py-1.5 text-right text-soil">
                    {formatKg(r.weightKg)}
                  </td>
                  <td className="py-1.5 text-right text-soil">
                    <Money value={r.avgPriceGhs} />
                  </td>
                  <td className="py-1.5 text-right text-ink">
                    <Money value={r.spentGhs} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}

export function ReportsLive() {
  const [window, setWindow] = useState<IReportWindow>(DEFAULT_RANGE);
  const profit = useGetProfitReportQuery(window);
  const expenses = useGetExpenseSummaryQuery(window);
  const s = profit.data?.data.summary;
  const windowQs = toQueryString(window);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
            Reports
          </h1>
          <p className="mt-0.5 text-[13px] text-soil">
            Profit, expenses, debtors and performance across the business
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector onChange={setWindow} />
          <AdminButton variant="outline" className="h-9 px-3 text-[13px]" asChild>
            <a href={`${EXPORTS}/commodity-profit.csv${windowQs}`}>Profit CSV</a>
          </AdminButton>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <ReportKpi label="Revenue" value={<Money value={s?.revenueGhs ?? null} />} />
        <ReportKpi
          label="Cost of goods"
          value={<Money value={s?.costGhs ?? null} />}
        />
        <ReportKpi
          label="Gross profit"
          value={<Money value={s?.grossProfitGhs ?? null} />}
        />
        <ReportKpi
          label="Expenses"
          value={<Money value={s?.expensesGhs ?? null} />}
        />
        <ReportKpi
          label="Net profit"
          value={<Money value={s?.netProfitGhs ?? null} />}
          accent
        />
        <ReportKpi
          label="Net margin"
          value={
            s?.netMarginPct === null || s?.netMarginPct === undefined
              ? "n/a"
              : `${s.netMarginPct.toLocaleString("en-GH", { maximumFractionDigits: 1 })}%`
          }
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProfitBarChart
          rows={profit.data?.data.byCommodity ?? []}
          hasEstimated={s?.hasEstimated}
        />
        <ExpenseDonut summary={expenses.data?.data} />
      </div>

      <div className="mb-5">
        <PlTrendChart />
      </div>

      <div className="mb-5">
        <DebtorsTable exportHref={`${EXPORTS}/debtors.csv`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AgentPerformance
          window={window}
          exportHref={`${EXPORTS}/agent-performance.csv${windowQs}`}
        />
        <PlStatement window={window} />
      </div>
    </div>
  );
}

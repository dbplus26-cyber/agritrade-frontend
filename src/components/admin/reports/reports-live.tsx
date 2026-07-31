"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DateRangeSelector,
  DEFAULT_RANGE,
} from "@/components/admin/dashboard/date-range-selector";
import { Money } from "@/components/admin/trading/sale-bits";
import { AdminButton, AdminCard, Mono, ToneBadge } from "@/components/admin/ui";
import { env } from "@/lib/env";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { formatKg } from "@/lib/format-money";
import { toQueryString } from "@/lib/to-query-string";
import { cn } from "@/lib/utils";
import {
  useGetAgentPerformanceQuery,
  useGetCashflowForecastQuery,
  useGetExpenseSummaryQuery,
  useGetProfitReportQuery,
} from "@/redux/reports/reports-api";
import type { ForecastDays } from "@/types/ops.types";
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

  const rowClass =
    "flex items-baseline justify-between gap-3 py-1.5 text-[13.5px] [&>span:first-child]:min-w-0 [&>span:first-child]:line-clamp-2 [&>*:last-child]:flex-none [&>*:last-child]:whitespace-nowrap";
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
          {/* Declared widths so the figures are never the columns that give
              way: an agent name has no natural limit and, left to size
              itself, took the whole row and wrapped every number beside it. */}
          <table className="w-full min-w-[560px] table-fixed text-[13px]">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[4.5rem]" />
              <col className="w-[7.5rem]" />
              <col className="w-[7rem]" />
              <col className="w-[9rem]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[11px] text-soil uppercase">
                <th className="py-1.5 pr-3">Agent</th>
                <th className="py-1.5 pr-3">Buys</th>
                <th className="py-1.5 pr-3">Weight</th>
                <th className="py-1.5 pr-3">Avg/kg</th>
                <th className="py-1.5">Spent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.agentName} className="border-t border-soil/10 align-top">
                  <td className="py-1.5 pr-3 text-ink">
                    <span className="line-clamp-2" title={r.agentName}>
                      {r.agentName}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-soil">
                    {r.purchases}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-soil">
                    {formatKg(r.weightKg)}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-soil">
                    <Money value={r.avgPriceGhs} />
                  </td>
                  <td className="py-1.5 whitespace-nowrap text-ink">
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

const FORECAST_DAYS: ForecastDays[] = [30, 60, 90];
const LIST_CAP = 6;

/**
 * "Cash coming in" - the forward look: confirmed sale balances plus farm
 * dues falling inside the chosen window, with the biggest positions listed.
 */
function CashComingIn() {
  const [days, setDays] = useState<ForecastDays>(30);
  const { data, isLoading, isError, error } = useGetCashflowForecastQuery({
    days,
  });
  const f = data?.data.forecast;
  const saleRows = f?.saleRows ?? [];
  const farmRows = f?.farmRows ?? [];

  const kpi = (label: string, value: number | null) => (
    <div className="min-w-0 flex-1 rounded-[6px] border border-soil/20 bg-surface-alt/50 px-3.5 py-2.5">
      <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </div>
      <div className="font-adminmono mt-0.5 text-[17px] font-bold text-leaf tabular-nums">
        <Money value={value} compact />
      </div>
    </div>
  );

  const moreLine = (hidden: number) =>
    hidden > 0 ? (
      <p className="pt-1.5 text-[12px] text-soil/70">
        + {hidden} more in this window
      </p>
    ) : null;

  return (
    <AdminCard className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Cash coming in
        </span>
        <div className="flex gap-1">
          {FORECAST_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={cn(
                "cursor-pointer rounded-[2px] border-[1.5px] px-2.5 py-1 text-[12px] font-semibold transition-colors",
                days === d
                  ? "border-console bg-console text-white"
                  : "border-soil/30 bg-paper text-soil hover:border-console/60",
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-2 text-[13px] text-soil">Loading the forecast…</p>
      ) : isError ? (
        <p className="py-2 text-[13px] text-error">
          {extractApiError(error).message}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 min-[420px]:flex-row">
            {kpi("Sales receivable", f?.salesReceivableGhs ?? null)}
            {kpi("Farm dues", f?.farmDueGhs ?? null)}
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-soil/70">
                Sale balances
              </div>
              {saleRows.length === 0 ? (
                <p className="py-1.5 text-[13px] text-soil">
                  No open sale balances in this window.
                </p>
              ) : (
                <>
                  {saleRows.slice(0, LIST_CAP).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-baseline justify-between gap-3 border-t border-soil/10 py-1.5 text-[13px] first:border-t-0"
                    >
                      <div className="min-w-0">
                        <span
                          className="block min-w-0 text-ink line-clamp-1 whitespace-normal [overflow-wrap:anywhere]"
                          title={r.buyer.name}
                        >
                          {r.buyer.name}
                        </span>
                        <Link
                          href={`/admin/sales/${r.id}`}
                          className="font-adminmono text-[11.5px] text-console tabular-nums underline-offset-2 hover:underline"
                        >
                          {r.transactionNo}
                        </Link>
                      </div>
                      <Mono className="flex-none text-ink">
                        <Money value={r.balanceGhs} compact />
                      </Mono>
                    </div>
                  ))}
                  {moreLine(saleRows.length - LIST_CAP)}
                </>
              )}
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-soil/70">
                Farm dues
              </div>
              {farmRows.length === 0 ? (
                <p className="py-1.5 text-[13px] text-soil">
                  No farm dues in this window.
                </p>
              ) : (
                <>
                  {farmRows.slice(0, LIST_CAP).map((r, i) => (
                    <div
                      key={`${r.farmer.id}-${r.season.id}-${i}`}
                      className="flex items-baseline justify-between gap-3 border-t border-soil/10 py-1.5 text-[13px] first:border-t-0"
                    >
                      <div className="min-w-0">
                        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                          <Link
                            href={`/admin/farmers/${r.farmer.id}`}
                            className="min-w-0 text-ink line-clamp-1 whitespace-normal [overflow-wrap:anywhere] underline-offset-2 hover:underline"
                            title={r.farmer.name}
                          >
                            {r.farmer.name}
                          </Link>
                          <span className="text-[11.5px] text-soil">
                            {r.season.name}
                          </span>
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-soil">
                          Due {formatDateTime(r.dueDate)}
                          {r.daysOverdue > 0 ? (
                            <ToneBadge tone="alert">
                              {r.daysOverdue}d overdue
                            </ToneBadge>
                          ) : null}
                        </span>
                      </div>
                      <Mono className="flex-none text-ink">
                        <Money value={r.outstandingGhs} compact />
                      </Mono>
                    </div>
                  ))}
                  {moreLine(farmRows.length - LIST_CAP)}
                </>
              )}
            </div>
          </div>
        </>
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
        <CashComingIn />
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
